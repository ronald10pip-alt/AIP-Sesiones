import React, { useState } from 'react';
import axios from 'axios';
import { UserPlus, FileUp, Trash2, Edit2, Download, CheckCircle2, AlertCircle, Users, UploadCloud, XCircle, Info, Trash, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GestionDocentes = ({ docentes, onUpdate }) => {
  const [form, setForm] = useState({ dni: '', nombre: '', role: 'docente' });
  const [csvFile, setCsvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [showRegistry, setShowRegistry] = useState(false);

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (form.dni.length !== 8) return setMsg({ type: 'error', text: 'El DNI debe tener 8 dígitos institucionales' });
    
    setLoading(true);
    try {
      await axios.post('http://localhost:3001/api/docentes/bulk', { 
        docentes: [form] 
      });
      setMsg({ type: 'success', text: 'Profesional registrado con éxito' });
      setForm({ dni: '', nombre: '', role: 'docente' });
      onUpdate();
    } catch (err) {
      setMsg({ type: 'error', text: 'Error al registrar profesional.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMsg({ type: '', text: '' }), 4000);
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const data = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const delimiter = line.includes(';') ? ';' : ',';
          const parts = line.split(delimiter);
          const dni = parts[0]?.trim();
          const nombre = parts[1]?.trim();

          if (dni && dni.length === 8) {
            data.push({ dni, nombre: nombre || 'DOCENTE SIN NOMBRE', role: 'docente' });
          }
        }
      }

      if (data.length === 0) return setMsg({ type: 'error', text: 'Archivo CSV inválido.' });

      setLoading(true);
      try {
        await axios.post('http://localhost:3001/api/docentes/bulk', { docentes: data });
        setMsg({ type: 'success', text: `${data.length} registros cargados exitosamente` });
        onUpdate();
        setCsvFile(null);
      } catch (err) {
        setMsg({ type: 'error', text: 'Error en la sincronización masiva.' });
      } finally {
        setLoading(false);
        setTimeout(() => setMsg({ type: '', text: '' }), 4000);
      }
    };
    reader.readAsText(csvFile);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que desea retirar este registro?')) return;
    try {
      await axios.delete(`http://localhost:3001/api/docentes/${id}`);
      onUpdate();
      setMsg({ type: 'success', text: 'Registro retirado con éxito' });
    } catch (err) {
      setMsg({ type: 'error', text: 'No se pudo retirar el registro.' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`¿Seguro que desea eliminar los ${selectedIds.length} docentes seleccionados y sus carpetas en Drive?`)) return;

    setLoading(true);
    try {
      await axios.post('http://localhost:3001/api/docentes/delete-bulk', { dnis: selectedIds });
      setMsg({ type: 'success', text: 'Eliminación masiva completada con éxito' });
      setSelectedIds([]);
      onUpdate();
    } catch (err) {
      setMsg({ type: 'error', text: 'Error al realizar el borrado masivo.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMsg({ type: '', text: '' }), 4000);
    }
  };

  const toggleSelectAll = () => {
    const onlyDocentes = docentes.filter(d => d.role !== 'pip').map(d => d.id);
    if (selectedIds.length === onlyDocentes.length && onlyDocentes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(onlyDocentes);
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--merinense-blue-dark)', letterSpacing: '-1.5px', marginBottom: '0.3rem' }}>Gestión de Personal</h2>
          <p style={{ color: '#6366F1', fontWeight: 700, fontSize: '0.85rem' }}>Administración del capital humano institucional</p>
        </div>
        <button 
          onClick={() => setShowRegistry(!showRegistry)}
          className="btn-login"
          style={{ 
            background: showRegistry ? 'var(--merinense-blue-dark)' : '#6366F1', 
            width: 'auto', 
            padding: '0.8rem 1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            fontSize: '11px',
            height: '42px'
          }}
        >
          {showRegistry ? <ChevronUp size={16} /> : <Plus size={16} />}
          {showRegistry ? 'OCULTAR HERRAMIENTAS' : 'AÑADIR PERSONAL'}
        </button>
      </div>

      <AnimatePresence>
        {showRegistry && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: '4rem' }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="m-grid">
              {/* Registro Manual */}
              <div className="m-col-8">
                <div className="merinense-card" style={{ padding: '1.5rem' }}>
                  <h3 className="metric-label" style={{ marginBottom: '1.5rem' }}>Registro Individual</h3>
                  <form onSubmit={handleManualAdd}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div className="form-group">
                        <label className="form-label">DNI Institucional</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={form.dni}
                          onChange={e => setForm({...form, dni: e.target.value.replace(/\D/g, '').slice(0, 8)})}
                          placeholder="8 números"
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Rol Asignado</label>
                        <select 
                          className="form-input" 
                          value={form.role}
                          onChange={e => setForm({...form, role: e.target.value})}
                          style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 800 }}
                        >
                          <option value="docente">Docente Merinense</option>
                          <option value="pip">Responsable PIP</option>
                          <option value="directivo">Panel Directivo</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label">Nombre Completo</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={form.nombre}
                        onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})}
                        placeholder="Apellidos y Nombres"
                        required 
                      />
                    </div>
                    <button type="submit" disabled={loading} className="btn-login" style={{ background: '#6366F1' }}>
                      {loading ? 'Guardando...' : 'Registrar Profesional'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Carga Masiva */}
              <div className="m-col-4">
                <div className="merinense-card" style={{ background: 'var(--merinense-blue-dark)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%', padding: '1.5rem' }}>
                  <div className="login-logo-container pip-logo" style={{ marginBottom: '1rem', width: '60px', height: '60px' }}>
                    <UploadCloud size={30} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-1px' }}>Carga Masiva</h3>
                  <p style={{ opacity: 0.6, fontSize: '0.75rem', marginBottom: '1.2rem' }}>Columna 1: DNI, Columna 2: Nombres</p>
                  
                  <input 
                    type="file" 
                    id="csvFile" 
                    style={{ display: 'none' }} 
                    accept=".csv" 
                    onChange={(e) => setCsvFile(e.target.files[0])} 
                  />
                  
                  <div style={{ width: '100%' }}>
                    {csvFile ? (
                      <button onClick={handleCsvUpload} disabled={loading} className="btn-login" style={{ background: '#10B981', border: 'none' }}>
                        {loading ? 'Sincronizando...' : `Subir ${csvFile.name}`}
                      </button>
                    ) : (
                      <button onClick={() => document.getElementById('csvFile').click()} className="btn-login" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        SELECCIONAR CSV
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabla de Personal */}
      <div className="m-table-container">
        <div style={{ padding: '1.2rem 2rem', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             <h3 className="metric-label" style={{ margin: 0 }}>Capital Humano Merinense</h3>
             {selectedIds.length > 0 && (
               <button 
                onClick={handleBulkDelete}
                className="badge-merinense" 
                style={{ background: '#FFF1F2', color: '#E11D48', border: '1px solid #FECDD3', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
               >
                 <Trash size={12} /> Eliminar {selectedIds.length} seleccionados
               </button>
             )}
          </div>
          <span className="badge-merinense" style={{ background: 'white', color: '#6366F1', border: '1px solid #E2E8F0' }}>{docentes.length} Usuarios</span>
        </div>
        <table className="m-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === docentes.filter(d => d.role !== 'pip').length && docentes.filter(d => d.role !== 'pip').length > 0} 
                  onChange={toggleSelectAll}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </th>
              <th>Profesional</th>
              <th>DNI</th>
              <th>Acceso</th>
              <th style={{ textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {docentes.map(d => (
              <tr key={d.id} style={{ background: selectedIds.includes(d.id) ? '#F0F9FF' : 'transparent', opacity: d.role === 'pip' ? 0.6 : 1 }}>
                <td>
                  <input 
                    type="checkbox" 
                    disabled={d.role === 'pip'}
                    checked={selectedIds.includes(d.id)} 
                    onChange={() => toggleSelectOne(d.id)}
                    style={{ width: '18px', height: '18px', cursor: d.role === 'pip' ? 'not-allowed' : 'pointer' }}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '45px', height: '45px', background: '#F1F5F9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                      {d.nombre?.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 800 }}>{d.nombre}</p>
                      <p style={{ fontSize: '10px', color: '#94A3B8' }}>#SomosMerinenses</p>
                    </div>
                  </div>
                </td>
                <td>
                  <p style={{ fontWeight: 700, letterSpacing: '1px' }}>{d.id}</p>
                </td>
                <td>
                  <span className="badge-merinense" style={{ background: d.role === 'pip' ? '#F5F3FF' : d.role === 'directivo' ? '#FEF3C7' : '#F0F9FF', color: d.role === 'pip' ? '#6366F1' : d.role === 'directivo' ? '#D97706' : '#00AEEF' }}>
                    {d.role === 'pip' ? 'ADMINISTRADOR' : d.role === 'directivo' ? 'DIRECTIVO' : 'DOCENTE'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {d.role !== 'pip' && (
                    <button onClick={() => handleDelete(d.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#FDA4AF' }}>
                      <Trash2 size={20} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {msg.text && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 2000 }}
          >
            <div style={{ background: 'white', padding: '1.5rem 2rem', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '15px' }}>
              {msg.type === 'success' ? <CheckCircle2 color="#10B981" /> : <XCircle color="#F43F5E" />}
              <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{msg.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GestionDocentes;
