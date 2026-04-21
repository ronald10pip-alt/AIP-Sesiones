const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

/**
 * CONFIGURACIÓN DE ACCESO FINAL (MODO PRODUCCIÓN 15GB)
 * Se utilizan las credenciales del Cliente Web validadas vía OAuth Playground.
 */
let auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

auth.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth });

console.log('--- SISTEMA MERINENSE: ACCESO A 15GB VALIDADO Y ACTIVO ---');

async function getOrCreateDocenteFolder(dni, nombre) {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  
  try {
    const response = await drive.files.list({
      q: `name contains '${dni}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    });

    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    const folderName = nombre ? `${dni}-${nombre}` : dni;
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    try {
      await drive.permissions.create({
        fileId: folder.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    } catch (e) {}

    return folder.data.id;
  } catch (error) {
    console.error(`Error en Drive para docente ${dni}:`, error.message);
    throw error;
  }
}

async function uploadSessionPDF(filePath, fileName, folderId) {
  const fileMetadata = { name: fileName, parents: [folderId] };
  const media = { mimeType: 'application/pdf', body: fs.createReadStream(filePath) };
  
  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, webViewLink',
  });

  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return { id: file.data.id, webViewLink: file.data.webViewLink };
}

async function deleteDocenteFolder(dni) {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  try {
    const response = await drive.files.list({
      q: `name contains '${dni}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    });
    if (response.data.files.length === 0) return;
    await drive.files.delete({ fileId: response.data.files[0].id });
  } catch (error) {
    console.error(`Error al eliminar carpeta ${dni}:`, error.message);
  }
}

async function deleteFile(fileId) {
  try {
    await drive.files.delete({ fileId });
  } catch (error) {
    console.error(`Error al eliminar archivo Drive ${fileId}:`, error.message);
  }
}

module.exports = { getOrCreateDocenteFolder, uploadSessionPDF, deleteDocenteFolder, deleteFile, drive };
