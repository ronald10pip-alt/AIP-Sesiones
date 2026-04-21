import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, Clock, AlertCircle, LogOut, Cpu, ArrowRight, LayoutDashboard, Share2, ClipboardList, Trash2, RefreshCw, Cloud, CloudOff, MessageSquare, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DocenteDashboard = ({ user, onLogout }) => {
  const [sessions, setSessions] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [view, setView] = useState('inicio');
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error'
  const pollRef = useRef(null);

  useEffect(() => {
    fetchSessions();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Auto-poll: si hay sesiones sin link de Drive, re-consultar cada 3s
  useEffect(() => {
    const hasPending = sessions.some(s => !s.driveViewLink);
    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await axios.get(`https://backend-aip.onrender.com/api/sessions/${user.dni}`);
          setSessions(res.data);
          const stillPending = res.data.some(s => !s.driveViewLink);
          if (!stillPending && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } catch {}
      }, 3000);
    } else if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [sessions]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`https://backend-aip.onrender.com/api/sessions/${user.dni}`);
      setSessions(res.data);
    } catch (err) {
      console.error('Error fetching sessions');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dni', user.dni);
    formData.append('nombreDocente', user.nombre);

    setUploading(true);
    setMsg({ type: '', text: '' });

    try {
      await axios.post('https://backend-aip.onrender.com/api/sessions/upload', formData);
      setMsg({ type: 'success', text: 'Sesión compartida con éxito' });
      setFile(null);
      fetchSessions();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Error al subir el archivo' });
    } finally {
      setUploading(false);
    }
  };
  
  const handleDeleteSession = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta sesión? Esta acción también borrará el archivo de Google Drive.')) return;
    
    try {
      await axios.delete(`https://backend-aip.onrender.com/api/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
      setMsg({ type: 'success', text: 'Sesión eliminada de AIP Sesiones y de Google Drive' });
      
      // Limpiar mensaje tras unos segundos
      setTimeout(() => setMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setMsg({ type: 'error', text: 'Error al intentar eliminar la sesión' });
    }
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      const res = await axios.get('https://backend-aip.onrender.com/api/sync/health');
      if (res.data.ok) {
        setSyncStatus('success');
        fetchSessions();
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
    setTimeout(() => setSyncStatus('idle'), 4000);
  };

  const uploadSection = (
    <div className="merinense-card" style={{ borderTop: '6px solid var(--merinense-celeste)', padding: '1.5rem' }}>
      <h3 className="metric-label" style={{ marginBottom: '1.2rem' }}>Subir Sesión de Aprendizaje</h3>
      <form onSubmit={handleUpload}>
        <div 
          className="upload-dropzone" 
          style={{ 
            border: '2px dashed #E2E8F0', 
            borderRadius: '20px', 
            padding: '1.5rem 1rem', 
            textAlign: 'center', 
            cursor: 'pointer',
            background: file ? '#F0F9FF' : 'transparent',
            borderColor: file ? 'var(--merinense-celeste)' : '#E2E8F0'
          }}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input id="fileInput" type="file" className="hidden" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
          <Upload size={40} color={file ? 'var(--merinense-celeste)' : '#CBD5E1'} style={{ marginBottom: '1rem' }} />
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--merinense-blue-dark)' }}>
            {file ? file.name : 'Haz clic para seleccionar PDF'}
          </p>
        </div>
        <AnimatePresence>
          {msg.text && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', background: msg.type === 'success' ? '#ECFDF5' : '#FFF1F2', color: msg.type === 'success' ? '#065F46' : '#991B1B', fontSize: '0.75rem', fontWeight: 700 }}
            >
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>
        <button type="submit" disabled={!file || uploading} className="btn-login" style={{ marginTop: '1.2rem', height: '48px' }}>
          {uploading ? 'Subiendo...' : 'Enviar sesión al PIP'}
        </button>
      </form>
    </div>
  );

  const historyTable = (
    <div className="merinense-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="metric-label" style={{ margin: 0 }}>Historial de Sesiones</h3>
        <span className="badge-merinense" style={{ background: '#F0F9FF', color: 'var(--merinense-celeste)' }}>{sessions.length} enviadas</span>
      </div>
      
      <div style={{ padding: '1.5rem 2rem', maxHeight: '60vh', overflowY: 'auto' }}>
        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <FileText size={48} color="#E2E8F0" style={{ marginBottom: '1rem' }} />
            <p style={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.85rem' }}>Aún no has enviado ninguna sesión.</p>
            <p style={{ color: '#CBD5E1', fontWeight: 600, fontSize: '0.75rem', marginTop: '0.3rem' }}>Usa "Enviar sesión al PIP" para comenzar.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {sessions.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  padding: '1rem 1.2rem',
                  background: s.estado !== 'Enviado' ? '#FAFFFE' : '#F8FAFC',
                  borderRadius: '16px',
                  border: `1px solid ${s.estado === 'Aprobado' ? '#BBF7D0' : s.estado === 'Observado' ? '#FDE68A' : '#F1F5F9'}`,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Fila principal */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Ícono + Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      width: '38px', height: '38px', borderRadius: '10px', 
                      background: s.driveViewLink ? '#E0F2FE' : '#FEF3C7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                    }}>
                      <FileText size={18} color={s.driveViewLink ? '#0284C7' : '#D97706'} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      {s.driveViewLink ? (
                        <a href={s.driveViewLink} target="_blank" rel="noreferrer" 
                          style={{ textDecoration: 'none', color: 'var(--merinense-blue-dark)', fontWeight: 800, fontSize: '0.8rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.nombreArchivo}
                        </a>
                      ) : (
                        <p style={{ fontWeight: 700, fontSize: '0.8rem', color: '#D97706' }}>Subiendo a Drive...</p>
                      )}
                      <p style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>{s.fecha} · {s.hora}</p>
                    </div>
                  </div>

                  {/* Estado */}
                  <div style={{ flexShrink: 0, marginLeft: '0.8rem' }}>
                    {s.estado === 'Aprobado' && <span className="badge-merinense" style={{ background: '#ECFDF5', color: '#10B981', fontSize: '9px' }}>Logrado ⭐</span>}
                    {s.estado === 'Observado' && <span className="badge-merinense" style={{ background: '#FFFBEB', color: '#F59E0B', fontSize: '9px' }}>Observado 💡</span>}
                    {s.estado === 'Enviado' && <span className="badge-merinense" style={{ background: '#F0F9FF', color: '#00AEEF', fontSize: '9px' }}>En Revisión ⏳</span>}
                  </div>

                  {/* Eliminar: solo si aún no fue evaluada */}
                  {s.estado === 'Enviado' ? (
                    <button 
                      onClick={() => handleDeleteSession(s.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#FDA4AF', padding: '6px', marginLeft: '0.5rem', flexShrink: 0, borderRadius: '8px', transition: 'all 0.2s' }}
                      title="Eliminar sesión"
                      onMouseOver={(e) => e.currentTarget.style.background = '#FFF1F2'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <div style={{ padding: '6px', marginLeft: '0.5rem', flexShrink: 0 }} title="Sesión evaluada por el PIP. No se puede eliminar.">
                      <Lock size={14} color="#CBD5E1" />
                    </div>
                  )}
                </div>

                {/* Retroalimentación del PIP (solo si existe) */}
                {s.observaciones && s.estado !== 'Enviado' && (
                  <div style={{ 
                    marginTop: '0.8rem', 
                    padding: '0.8rem 1rem', 
                    background: s.estado === 'Aprobado' ? '#F0FDF4' : '#FFFBEB',
                    borderRadius: '10px',
                    borderLeft: `3px solid ${s.estado === 'Aprobado' ? '#22C55E' : '#F59E0B'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <MessageSquare size={14} color={s.estado === 'Aprobado' ? '#16A34A' : '#D97706'} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: s.estado === 'Aprobado' ? '#16A34A' : '#D97706', marginBottom: '3px' }}>Retroalimentación PIP</p>
                        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--merinense-blue-dark)', lineHeight: 1.4 }}>{s.observaciones}</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const statsCard = (
    <div className="metric-card" style={{ marginTop: '2.5rem', background: 'var(--merinense-blue-dark)', color: 'white' }}>
      <div>
        <p className="metric-label" style={{ color: 'rgba(255,255,255,0.4)' }}>Innovaciones</p>
        <p className="metric-value" style={{ color: 'white' }}>{sessions.length}</p>
      </div>
      <Cpu size={40} opacity={0.2} />
    </div>
  );

  return (
    <div className="dash-container">
      {/* Sidebar Fija Docente */}
      <div className="dash-sidebar docente-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2rem' }}>
          <div className="login-logo-container" style={{ width: '45px', height: '45px', marginBottom: 0, borderRadius: '12px' }}>
            <Cpu size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>MERINENSE DIGITAL</h1>
            <p className="hashtag-merinense" style={{ fontSize: '8px', color: '#CAF0F8' }}>#InnovaciónEducativa</p>
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <button onClick={() => setView('inicio')} className={`nav-link ${view === 'inicio' ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Mi Espacio
          </button>
          <button onClick={() => setView('innovacion')} className={`nav-link ${view === 'innovacion' ? 'active' : ''}`}>
            <Share2 size={20} /> Enviar sesión al PIP
          </button>
          <button onClick={() => setView('bitacora')} className={`nav-link ${view === 'bitacora' ? 'active' : ''}`}>
            <ClipboardList size={20} /> Mi Bitácora
          </button>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '8px', fontWeight: 900, color: 'var(--merinense-celeste)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Docente Merinense</p>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.nombre}</p>
            </div>
            
            <p className="lema-merinense" style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', marginBottom: '1.5rem', textAlign: 'center' }}>ESTUDIO • DISCIPLINA • SUPERACIÓN</p>

            <button 
              onClick={handleSync} 
              disabled={syncStatus === 'syncing'}
              className="nav-link" 
              style={{ 
                color: syncStatus === 'success' ? '#10B981' : syncStatus === 'error' ? '#F87171' : '#94A3B8',
                marginBottom: '0.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              {syncStatus === 'syncing' ? (
                <><RefreshCw size={20} className="animate-spin" /> Sincronizando...</>
              ) : syncStatus === 'success' ? (
                <><Cloud size={20} /> ¡Sincronizado!</>
              ) : syncStatus === 'error' ? (
                <><CloudOff size={20} /> Sin conexión</>
              ) : (
                <><RefreshCw size={20} /> Sincronizar Nube</>
              )}
            </button>

            <button onClick={onLogout} className="nav-link" style={{ color: '#F87171', marginBottom: '1.5rem' }}>
              <LogOut size={20} /> Cerrar Sesión
            </button>

            <div style={{ padding: '0 1rem', opacity: 0.4 }}>
               <p style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                 Creado por PIP. Edwin Ronald Cruz Ruiz
               </p>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="dash-content">
        <header style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--merinense-blue-dark)' }}>Bienvenido, Colega</h2>
          <p style={{ color: 'var(--merinense-celeste)', fontWeight: 700, fontSize: '0.9rem' }}>Compartamos innovación para transformar el aprendizaje.</p>
        </header>

        <AnimatePresence mode="wait">
          {view === 'inicio' && (
            <motion.div 
              key="inicio"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="m-grid"
            >
              <div className="m-col-4">
                {uploadSection}
                {statsCard}
              </div>
              <div className="m-col-8">
                {historyTable}
              </div>
            </motion.div>
          )}

          {view === 'innovacion' && (
            <motion.div 
              key="innovacion"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ maxWidth: '600px', margin: '0 auto' }}
            >
               {uploadSection}
            </motion.div>
          )}

          {view === 'bitacora' && (
            <motion.div 
              key="bitacora"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
               {historyTable}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default DocenteDashboard;
