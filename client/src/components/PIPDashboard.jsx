import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, FileStack, TrendingUp, Search, Eye, Edit3, CheckCircle2, AlertCircle, XCircle, LogOut, Cpu, LayoutDashboard, Settings, RefreshCw, Cloud, CloudOff, Trash2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GestionDocentes from './GestionDocentes';

const PIPDashboard = ({ onLogout }) => {
  const [sessions, setSessions] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [filter, setFilter] = useState({ search: '', status: '', month: '' });
  const [view, setView] = useState('supervision'); // 'supervision' or 'docentes'
  const [selectedSession, setSelectedSession] = useState(null);
  const [evalData, setEvalData] = useState({ estado: '', observaciones: '' });
  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sessRes, docRes] = await Promise.all([
        axios.get('https://backend-aip.onrender.com/api/pip/sessions'),
        axios.get('https://backend-aip.onrender.com/api/docentes')
      ]);
      setSessions(sessRes.data);
      setDocentes(docRes.data);
    } catch (err) {
      console.error('Error fetching data');
    }
  };

  const handleUpdateSession = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`https://backend-aip.onrender.com/api/sessions/${selectedSession.id}`, evalData);
      setSelectedSession(null);
      fetchData();
    } catch (err) {
      alert('Error al actualizar');
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('¿Seguro que desea eliminar esta sesión? Se borrará del aplicativo y de Google Drive.')) return;
    try {
      await axios.delete(`https://backend-aip.onrender.com/api/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
    } catch (err) {
      alert('Error al eliminar la sesión');
    }
  };

  const filteredSessions = sessions.filter(s => {
    const doc = docentes.find(d => d.id === s.dni);
    const matchesSearch = doc?.nombre.toLowerCase().includes(filter.search.toLowerCase()) || s.dni.includes(filter.search);
    const matchesStatus = filter.status ? s.estado === filter.status : true;
    
    // Extraer mes de la fecha "YYYY-MM-DD"
    const sessionMonth = s.fecha ? parseInt(s.fecha.split('-')[1], 10) : null;
    const matchesMonth = filter.month ? sessionMonth === parseInt(filter.month, 10) : true;
    
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const getMonthName = (monthNumber) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[monthNumber - 1];
  };

  const handleDownloadHTML = () => {
    if (filteredSessions.length === 0) return alert('No hay sesiones para descargar en la vista actual.');
    
    const monthName = filter.month ? getMonthName(parseInt(filter.month, 10)) : 'Todos los meses';
    
    let htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Sesiones - ${monthName}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #0284c7; margin-bottom: 5px; }
        .header p { color: #64748b; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background-color: #f1f5f9; color: #0f172a; font-weight: 700; text-transform: uppercase; font-size: 12px; }
        td { font-size: 14px; vertical-align: top; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .badge-logrado { background: #dcfce7; color: #16a34a; }
        .badge-observado { background: #fef3c7; color: #d97706; }
        .badge-revision { background: #ffe4e6; color: #e11d48; }
        .docente { font-weight: 700; color: #0f172a; }
        .dni { font-size: 11px; color: #64748b; }
        .feedback { font-size: 13px; color: #334155; max-width: 300px; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Reporte de Sesiones AIP</h1>
        <p>Mes: ${monthName} | Total sesiones: ${filteredSessions.length}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th>Docente</th>
                <th>Innovación (Archivo)</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Retroalimentación PIP</th>
            </tr>
        </thead>
        <tbody>
`;

    filteredSessions.forEach(s => {
      const doc = docentes.find(d => d.id === s.dni);
      const nombreDocente = doc ? doc.nombre : s.dni;
      let badgeClass = 'badge-revision';
      let estadoText = 'EN REVISIÓN';
      
      if (s.estado === 'Aprobado') { badgeClass = 'badge-logrado'; estadoText = 'LOGRADO'; }
      if (s.estado === 'Observado') { badgeClass = 'badge-observado'; estadoText = 'OBSERVADO'; }

      htmlContent += `
        <tr>
            <td>
                <div class="docente">${nombreDocente}</div>
                <div class="dni">DNI: ${s.dni}</div>
            </td>
            <td>${s.nombreArchivo}</td>
            <td>${s.fecha}</td>
            <td><span class="badge ${badgeClass}">${estadoText}</span></td>
            <td class="feedback">${s.observaciones || '<span style="color:#94a38b;font-style:italic;">Sin retroalimentación</span>'}</td>
        </tr>
      `;
    });

    htmlContent += `
        </tbody>
    </table>
</body>
</html>
`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_${monthName}_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const stats = {
    total: sessions.length,
    aprobados: sessions.filter(s => s.estado === 'Aprobado').length,
    observados: sessions.filter(s => s.estado === 'Observado').length,
    docentes: docentes.length
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      const res = await axios.get('https://backend-aip.onrender.com/api/sync/health');
      if (res.data.ok) {
        setSyncStatus('success');
        fetchData();
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
    setTimeout(() => setSyncStatus('idle'), 4000);
  };

  return (
    <div className="dash-container">
      {/* Sidebar Fija Merinense */}
      <div className="dash-sidebar pip-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2rem' }}>
          <div className="login-logo-container pip-logo" style={{ width: '45px', height: '45px', marginBottom: 0, borderRadius: '12px' }}>
            <Cpu size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>PIP DIGITAL</h1>
            <p className="hashtag-merinense pip-accent" style={{ fontSize: '8px' }}>#GestiónMerinense</p>
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <button 
            onClick={() => setView('supervision')}
            className={`nav-link ${view === 'supervision' ? 'active pip-mode' : ''}`}
          >
            <LayoutDashboard size={20} /> Acompañamiento
          </button>

          <button 
            onClick={() => setView('docentes')}
            className={`nav-link ${view === 'docentes' ? 'active pip-mode' : ''}`}
          >
            <Users size={20} /> Gestión Docentes
          </button>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '20px', marginBottom: '2rem' }}>
              <p style={{ fontSize: '9px', fontWeight: 900, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Sesión Activa</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>Ronald Cruz</p>
            </div>
            
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
              <LogOut size={20} /> Finalizar Jornada
            </button>

            <div style={{ padding: '0 1rem', opacity: 0.4 }}>
               <p style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                 Creado por PIP. Edwin Ronald Cruz Ruiz
               </p>
            </div>
        </div>
      </div>

      {/* Workspace Principal */}
      <main className="dash-content">
        <AnimatePresence mode="wait">
          {view === 'supervision' ? (
            <motion.div 
              key="supervision"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--merinense-blue-dark)' }}>Panel de Control</h2>
                  <p style={{ color: '#6366F1', fontWeight: 700, fontSize: '0.9rem' }}>Supervisión y Acompañamiento Pedagógico</p>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <div className="search-container">
                    <Search style={{ position: 'absolute', left: '1.2rem', top: '1.2rem', color: '#94A3B8' }} />
                    <input 
                      type="text" 
                      placeholder="Buscar docente..." 
                      className="search-input"
                      value={filter.search}
                      onChange={(e) => setFilter({...filter, search: e.target.value})}
                    />
                  </div>
                  <select 
                    className="form-input" 
                    style={{ width: '150px', height: '60px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}
                    value={filter.month}
                    onChange={(e) => setFilter({...filter, month: e.target.value})}
                  >
                    <option value="">TODOS MESES</option>
                    <option value="3">Marzo</option>
                    <option value="4">Abril</option>
                    <option value="5">Mayo</option>
                    <option value="6">Junio</option>
                    <option value="7">Julio</option>
                    <option value="8">Agosto</option>
                    <option value="9">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </select>
                  <select 
                    className="form-input" 
                    style={{ width: '150px', height: '60px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}
                    value={filter.status}
                    onChange={(e) => setFilter({...filter, status: e.target.value})}
                  >
                    <option value="">TODOS</option>
                    <option value="Enviado">EN REVISIÓN</option>
                    <option value="Aprobado">LOGRADO</option>
                    <option value="Observado">OBSERVADO</option>
                  </select>
                  <button 
                    className="btn-merinense" 
                    style={{ height: '60px', padding: '0 1.5rem', background: '#0284C7', color: 'white', display: 'flex', gap: '8px', alignItems: 'center' }}
                    onClick={handleDownloadHTML}
                    title="Exportar sesiones visibles a HTML"
                  >
                    <Download size={18} />
                    EXPORTAR
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="m-grid" style={{ marginBottom: '2rem' }}>
                <div className="metric-card">
                  <div>
                    <p className="metric-label">Total Sesiones</p>
                    <p className="metric-value">{stats.total}</p>
                  </div>
                  <FileStack size={40} color="#6366F1" opacity={0.2} />
                </div>
                <div className="metric-card">
                  <div>
                    <p className="metric-label">Logrados ⭐</p>
                    <p className="metric-value" style={{ color: '#10B981' }}>{stats.aprobados}</p>
                  </div>
                  <CheckCircle2 size={40} color="#10B981" opacity={0.2} />
                </div>
                <div className="metric-card">
                  <div>
                    <p className="metric-label">Observados 💡</p>
                    <p className="metric-value" style={{ color: '#F59E0B' }}>{stats.observados}</p>
                  </div>
                  <AlertCircle size={40} color="#F59E0B" opacity={0.2} />
                </div>
                <div className="metric-card">
                  <div>
                    <p className="metric-label">Docentes</p>
                    <p className="metric-value" style={{ color: '#00AEEF' }}>{stats.docentes}</p>
                  </div>
                  <Users size={40} color="#00AEEF" opacity={0.2} />
                </div>
              </div>

              {/* Sessions Table */}
              <div className="m-table-container">
                <table className="m-table">
                  <thead>
                    <tr>
                      <th>Docente</th>
                      <th>Innovación</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map(s => {
                      const doc = docentes.find(d => d.id === s.dni);
                      return (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <div style={{ width: '45px', height: '45px', background: '#F1F5F9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                                {doc?.nombre.charAt(0)}
                              </div>
                              <div>
                                <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>{doc?.nombre || 'Docente'}</p>
                                <p style={{ fontSize: '10px', color: '#94A3B8' }}>DNI {s.dni}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <a href={s.driveViewLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--merinense-blue-dark)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileStack size={14} color="#00AEEF" /> {s.nombreArchivo}
                            </a>
                          </td>
                          <td>
                            <p style={{ fontWeight: 700 }}>{s.fecha}</p>
                            <p style={{ fontSize: '10px', color: '#94A3B8' }}>{s.hora}</p>
                          </td>
                          <td>
                            {s.estado === 'Aprobado' && <span className="badge-merinense" style={{ background: '#ECFDF5', color: '#10B981' }}>LOGRADO ⭐</span>}
                            {s.estado === 'Observado' && <span className="badge-merinense" style={{ background: '#FFFBEB', color: '#F59E0B' }}>OBSERVADO 💡</span>}
                            {s.estado === 'Enviado' && <span className="badge-merinense" style={{ background: '#FFF1F2', color: '#E11D48' }}>EN REVISIÓN 🔴</span>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button 
                                onClick={() => {
                                  setSelectedSession(s);
                                  setEvalData({ estado: s.estado, observaciones: s.observaciones || '' });
                                }}
                                className="btn-merinense"
                                style={{ padding: '0.8rem 1.2rem', fontSize: '9px', background: '#F1F5F9', color: 'var(--merinense-blue-dark)' }}
                              >
                                VALORAR <Edit3 size={12} style={{ marginLeft: '5px' }} />
                              </button>
                              <button 
                                onClick={() => handleDeleteSession(s.id)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#FDA4AF', padding: '8px', borderRadius: '10px', transition: 'all 0.2s' }}
                                title="Eliminar sesión (Drive + Aplicativo)"
                                onMouseOver={(e) => e.currentTarget.style.background = '#FFF1F2'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div key="docentes" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <GestionDocentes docentes={docentes} onUpdate={fetchData} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Institutional Valuation Modal */}
      {selectedSession && (
        <div className="m-modal-overlay">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="m-modal-content">
            <div style={{ background: '#6366F1', padding: '1.5rem 2.5rem', color: 'white' }}>
               <h3 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Valoración Pedagógica</h3>
               <p style={{ opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', fontSize: '9px', letterSpacing: '2px' }}>
                  Acompañamiento Técnico • {docentes.find(d => d.id === selectedSession.dni)?.nombre}
               </p>
            </div>
            
            <form onSubmit={handleUpdateSession} style={{ padding: '2rem 2.5rem' }}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Estado de Sesión</label>
                <select 
                  className="form-input"
                  value={evalData.estado} 
                  onChange={e => setEvalData({...evalData, estado: e.target.value})}
                  required
                >
                  <option value="Enviado">En Revisión ⏳</option>
                  <option value="Aprobado">Logrado ⭐</option>
                  <option value="Observado">Por Mejorar 💡</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Retroalimentación / Sugerencias</label>
                <textarea 
                  className="form-input"
                  style={{ height: '150px', padding: '1.5rem', resize: 'none' }}
                  value={evalData.observaciones}
                  onChange={e => setEvalData({...evalData, observaciones: e.target.value})}
                  placeholder="Escribe aquí las orientaciones pedagógicas..."
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '2rem' }}>
                <button type="button" onClick={() => setSelectedSession(null)} className="btn-login" style={{ background: '#F1F5F9', color: '#64748B' }}>Cancelar</button>
                <button type="submit" className="btn-login" style={{ background: '#6366F1' }}>Guardar Valoración</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PIPDashboard;
