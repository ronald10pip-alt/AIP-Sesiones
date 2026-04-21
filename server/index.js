const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, admin } = require('./db');
const { getOrCreateDocenteFolder, uploadSessionPDF, deleteDocenteFolder, deleteFile, drive } = require('./drive');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configuración de Multer para archivos temporales
const upload = multer({ 
  dest: 'temp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

// --- RUTAS ---

// Sincronización: Health Check (Firebase + Google Drive)
app.get('/api/sync/health', async (req, res) => {
  const results = { firebase: false, drive: false, timestamp: new Date().toISOString() };

  // Check Firebase
  try {
    await db.collection('docentes').limit(1).get();
    results.firebase = true;
  } catch (e) {
    console.warn('Sync check - Firebase falló:', e.message);
  }

  // Check Google Drive
  try {
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    await drive.files.get({ fileId: rootFolderId, fields: 'id' });
    results.drive = true;
  } catch (e) {
    console.warn('Sync check - Drive falló:', e.message);
  }

  const allOk = results.firebase && results.drive;
  res.json({ ok: allOk, services: results });
});

// Autenticación: Login con DNI (Usuario y Clave)
app.post('/api/auth/login', async (req, res) => {
  const { dni, password } = req.body;
  if (!dni || dni.length !== 8) return res.status(400).json({ error: 'DNI inválido' });

  try {
    const doc = await db.collection('docentes').doc(dni).get();
    if (!doc.exists) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = doc.data();
    if (user.password !== password) return res.status(401).json({ error: 'Contraseña incorrecta' });

    res.json({ dni: user.id, nombre: user.nombre, role: user.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subida de sesión (Docente) — OPTIMIZADO: Respuesta instantánea + Drive en background
app.post('/api/sessions/upload', upload.single('file'), async (req, res) => {
  const { dni, nombreDocente } = req.body;
  const file = req.file;

  if (!file || !dni) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const originalNameWithoutExt = file.originalname.replace(/\.pdf$/i, '').replace(/\s+/g, '_');
    const newFileName = `${originalNameWithoutExt}_${day}-${month}.pdf`;

    // 1. Guardar en Firestore INMEDIATAMENTE (sin Drive aún)
    const sessionData = {
      dni,
      fecha: `${now.getFullYear()}-${month}-${day}`,
      hora: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
      driveFileId: '',
      driveViewLink: '',
      nombreArchivo: newFileName,
      estado: 'Enviado',
      valoracion: 'En proceso',
      observaciones: '',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('sesiones').add(sessionData);

    // 2. Responder INMEDIATAMENTE al docente
    res.json({ message: 'Sesión registrada. Subiendo archivo a Drive...', fileId: docRef.id });

    // 3. Subir a Drive EN SEGUNDO PLANO
    const filePath = file.path;
    (async () => {
      try {
        const folderId = await getOrCreateDocenteFolder(dni, nombreDocente);
        const driveResult = await uploadSessionPDF(filePath, newFileName, folderId);
        
        // Actualizar Firestore con el link de Drive
        await db.collection('sesiones').doc(docRef.id).update({
          driveFileId: driveResult.id,
          driveViewLink: driveResult.webViewLink,
        });
        console.log(`[BACKGROUND] ✅ PDF subido a Drive: ${newFileName}`);
      } catch (e) {
        console.error(`[BACKGROUND] ❌ Error subiendo a Drive:`, e.message);
      } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    })();

  } catch (error) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(500).json({ error: error.message });
  }
});

// Obtener sesiones de un docente
app.get('/api/sessions/:dni', async (req, res) => {
  const { dni } = req.params;
  try {
    const snapshot = await db.collection('sesiones')
      .where('dni', '==', dni)
      .get();
    
    const sesiones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Ordenar en memoria (descendente por timestamp)
    sesiones.sort((a, b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeB - timeA;
    });
    
    res.json(sesiones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gestión de Docentes: CRUD & Bulk
app.get('/api/docentes', async (req, res) => {
  try {
    const snapshot = await db.collection('docentes').get();
    const docentes = snapshot.docs.map(doc => doc.data());
    res.json(docentes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Utilidad: Procesar promesas con concurrencia limitada (evita saturar la API de Google)
async function processBatchWithConcurrency(items, fn, concurrency = 5) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

app.post('/api/docentes/bulk', async (req, res) => {
  const { docentes } = req.body;
  try {
    // 1. Guardar TODOS en Firestore de golpe (Instantáneo)
    const batch = db.batch();
    docentes.forEach(doc => {
      const docRef = db.collection('docentes').doc(doc.dni);
      batch.set(docRef, {
        id: doc.dni,
        nombre: doc.nombre,
        password: doc.role === 'directivo' ? 'merino2026' : doc.dni, 
        role: doc.role || 'docente',
        fechaRegistro: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();

    // 2. Responder INMEDIATAMENTE al usuario
    res.json({ message: `${docentes.length} docentes registrados. Las carpetas de Drive se están creando en segundo plano.` });

    // 3. Crear carpetas en Drive EN SEGUNDO PLANO con concurrencia controlada (5 a la vez)
    const docentesParaDrive = docentes.filter(doc => doc.role !== 'pip');
    console.log(`[BACKGROUND] Creando ${docentesParaDrive.length} carpetas en Drive (lotes de 5)...`);
    
    processBatchWithConcurrency(docentesParaDrive, (doc) => 
      getOrCreateDocenteFolder(doc.dni, doc.nombre).catch(e => console.warn(`Drive folder error ${doc.dni}:`, e.message))
    , 5).then(() => {
      console.log(`[BACKGROUND] ✅ Todas las carpetas de Drive creadas correctamente`);
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Borrado masivo (Optimizado: Lecturas paralelas + Drive en background)
app.post('/api/docentes/delete-bulk', async (req, res) => {
  const { dnis } = req.body;
  if (!dnis || dnis.length === 0) return res.status(400).json({ error: 'No se seleccionaron DNIs' });

  try {
    // 1. Leer TODOS los docentes en PARALELO (no secuencial)
    const docReads = await Promise.all(dnis.map(id => db.collection('docentes').doc(id).get()));
    
    const dnisToDelete = [];
    const batch = db.batch();

    for (const doc of docReads) {
      if (doc.exists && doc.data().role !== 'pip') {
        dnisToDelete.push(doc.id);
        batch.delete(doc.ref);
      }
    }

    if (dnisToDelete.length === 0) return res.status(400).json({ error: 'No se seleccionaron docentes válidos para eliminar.' });

    // 2. Leer TODAS las sesiones en PARALELO
    const sessReads = await Promise.all(dnisToDelete.map(id => db.collection('sesiones').where('dni', '==', id).get()));
    sessReads.forEach(snapshot => {
      snapshot.forEach(sess => batch.delete(sess.ref));
    });

    // 3. Ejecutar batch de Firestore y responder INMEDIATAMENTE
    await batch.commit();
    res.json({ message: `Se han eliminado ${dnisToDelete.length} registros. Drive se limpia en segundo plano.` });

    // 4. Borrar carpetas de Drive EN SEGUNDO PLANO con concurrencia controlada
    console.log(`[BACKGROUND] Eliminando ${dnisToDelete.length} carpetas de Drive (lotes de 5)...`);
    processBatchWithConcurrency(dnisToDelete, (id) => 
      deleteDocenteFolder(id).catch(e => console.warn(`Drive delete error ${id}:`, e.message))
    , 5).then(() => {
      console.log(`[BACKGROUND] ✅ Todas las carpetas de Drive eliminadas`);
    });

  } catch (error) {
    console.error('Error en delete-bulk:', error);
    res.status(500).json({ error: error.message });
  }
});

// Borrado individual
app.delete('/api/docentes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const docRef = db.collection('docentes').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: 'No existe el docente' });
    if (doc.data().role === 'pip') return res.status(403).json({ error: 'No se puede eliminar un administrador' });

    const batch = db.batch();
    
    // Borrar sesiones
    const sessQuery = await db.collection('sesiones').where('dni', '==', id).get();
    sessQuery.forEach(sess => batch.delete(sess.ref));
    
    // Borrar perfil
    batch.delete(docRef);

    // Borrar en Drive (Segundo plano)
    deleteDocenteFolder(id).catch(e => console.warn(`Error background Drive ${id}:`, e.message));

    await batch.commit();
    res.json({ message: 'Docente eliminado correctamente' });
  } catch (error) {
    console.error('Error en delete individual:', error);
    res.status(500).json({ error: error.message });
  }
});

// Supervisión PIP: Todas las sesiones
app.get('/api/pip/sessions', async (req, res) => {
  try {
    const snapshot = await db.collection('sesiones').orderBy('timestamp', 'desc').get();
    const sesiones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(sesiones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar valoración/observaciones (PIP)
app.patch('/api/sessions/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    await db.collection('sesiones').doc(id).update(updates);
    res.json({ message: 'Sesión actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Borrado de sesión por el docente
app.delete('/api/sessions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sessionDoc = await db.collection('sesiones').doc(id).get();
    if (!sessionDoc.exists) return res.status(404).json({ error: 'La sesión no existe' });

    const sessionData = sessionDoc.data();
    
    // 1. Borrar en Google Drive (En segundo plano - ¡MODO TURBO!)
    if (sessionData.driveFileId) {
      deleteFile(sessionData.driveFileId).catch(e => console.error(`Error background Drive file delete:`, e.message));
    }

    // 2. Borrar en Firestore (Instantáneo)
    await db.collection('sesiones').doc(id).delete();

    res.json({ message: 'Sesión eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar sesión:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor AIP corriendo en el puerto ${PORT}`);
});
