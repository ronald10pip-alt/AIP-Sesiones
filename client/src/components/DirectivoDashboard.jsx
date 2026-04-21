import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileStack, CheckCircle2, AlertCircle, Search, LogOut, LayoutDashboard, Download, Eye, Users, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DirectivoDashboard = ({ user, onLogout }) => {
  const [sessions, setSessions] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [filter, setFilter] = useState({ search: '', status: '', month: '' });
  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sessRes, docRes] = await Promise.all([
        axios.get('http://localhost:3001/api/pip/sessions'),
        axios.get('http://localhost:3001/api/docentes')
      ]);
      setSessions(sessRes.data);
      setDocentes(docRes.data);
    } catch (err) {
      console.error('Error fetching data');
    }
  };

  const filteredSessions = sessions.filter(s => {
    const doc = docentes.find(d => d.id === s.dni);
    const matchesSearch = doc?.nombre.toLowerCase().includes(filter.search.toLowerCase()) || s.dni.includes(filter.search);
    const matchesStatus = filter.status ? s.estado === filter.status : true;
    
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
    <title>Reporte Directivo de Sesiones - ${monthName}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fffbeb; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #d97706; margin-bottom: 5px; }
        .header p { color: #92400e; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #fde68a; }
        th { background-color: #fef3c7; color: #92400e; font-weight: 700; text-transform: uppercase; font-size: 12px; }
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
        <h1>Reporte Institucional - Panel Directivo</h1>
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
      if (doc && (doc.role === 'pip' || doc.role === 'directivo')) return;

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
            <td class="feedback">${s.observaciones || '<span style="color:#b45309;font-style:italic;">Sin retroalimentación</span>'}</td>
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
    link.download = `Reporte_Directivo_${monthName}_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      const res = await axios.get('http://localhost:3001/api/sync/health');
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

  const stats = {
    total: sessions.length,
    aprobados: sessions.filter(s => s.estado === 'Aprobado').length,
    observados: sessions.filter(s => s.estado === 'Observado').length,
    docentes: docentes.filter(d => d.role !== 'pip' && d.role !== 'directivo').length
  };

  return (
    <div className="dash-container">
      {/* Sidebar Fija Directivo */}
      <div className="dash-sidebar pip-sidebar" style={{ background: '#FFFBEB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2rem' }}>
          <div className="login-logo-container" style={{ width: '45px', height: '45px', marginBottom: 0, borderRadius: '12px', background: '#D97706', color: 'white' }}>
            <Eye size={22} />
          </div>
          <div>
             <h1 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, color: '#92400E' }}>GESTIÓN DIRECTIVA</h1>
             <p className="hashtag-merinense" style={{ fontSize: '8px', color: '#D97706' }}>#MonitoreoInstitucional</p>
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <button className="nav-link active" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <LayoutDashboard size={20} /> Panel Histórico
          </button>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid #FDE68A' }}>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', marginBottom: '2rem', border: '1px solid #FDE68A' }}>
              <p style={{ fontSize: '9px', fontWeight: 900, color: '#D97706', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Cuenta Directiva</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400E' }}>{user.nombre}</p>
            </div>

            <button 
              onClick={handleSync} 
              disabled={syncStatus === 'syncing'}
              className="nav-link" 
              style={{ 
                color: syncStatus === 'success' ? '#10B981' : syncStatus === 'error' ? '#F87171' : '#D97706',
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
              <LogOut size={20} /> Finalizar Sesión
            </button>

            <div style={{ padding: '0 1rem', opacity: 0.6 }}>
               <p style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#B45309' }}>
                 Creado por PIP. Edwin Ronald Cruz Ruiz
               </p>
            </div>
        </div>
      </div>

      {/* Workspace Principal */}
      <main className="dash-content">
        <AnimatePresence mode="wait">
            <motion.div 
              key="supervision"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px', color: '#92400E' }}>Panel de Observación</h2>
                  <p style={{ color: '#D97706', fontWeight: 700, fontSize: '0.9rem' }}>Monitoreo del cumplimiento y valoración de sesiones.</p>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <div className="search-container">
                    <Search style={{ position: 'absolute', left: '1.2rem', top: '1.2rem', color: '#94A3B8' }} />
                    <input 
                      type="text" 
                      placeholder="Buscar docente o DNI..." 
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
                    style={{ height: '60px', padding: '0 1.5rem', background: '#D97706', color: 'white', display: 'flex', gap: '8px', alignItems: 'center', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 800 }}
                    onClick={handleDownloadHTML}
                    title="Exportar consolidado mensual a HTML"
                  >
                    <Download size={18} />
                    EXPORTAR
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="m-grid" style={{ marginBottom: '2rem' }}>
                <div className="metric-card" style={{ background: '#FFFBEB', borderColor: '#FEF3C7' }}>
                  <div>
                    <p className="metric-label" style={{ color: '#D97706' }}>Total Sesiones</p>
                    <p className="metric-value" style={{ color: '#92400E' }}>{stats.total}</p>
                  </div>
                  <FileStack size={40} color="#D97706" opacity={0.2} />
                </div>
                <div className="metric-card" style={{ background: '#ECFDF5', borderColor: '#D1FAE5' }}>
                  <div>
                    <p className="metric-label" style={{ color: '#059669' }}>Logrados ⭐</p>
                    <p className="metric-value" style={{ color: '#065F46' }}>{stats.aprobados}</p>
                  </div>
                  <CheckCircle2 size={40} color="#059669" opacity={0.2} />
                </div>
                <div className="metric-card" style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}>
                  <div>
                    <p className="metric-label" style={{ color: '#D97706' }}>Observados 💡</p>
                    <p className="metric-value" style={{ color: '#92400E' }}>{stats.observados}</p>
                  </div>
                  <AlertCircle size={40} color="#D97706" opacity={0.2} />
                </div>
                <div className="metric-card" style={{ background: '#F0F9FF', borderColor: '#E0F2FE' }}>
                  <div>
                    <p className="metric-label" style={{ color: '#0284C7' }}>Docentes Activos</p>
                    <p className="metric-value" style={{ color: '#0369A1' }}>{stats.docentes}</p>
                  </div>
                  <Users size={40} color="#0284C7" opacity={0.2} />
                </div>
              </div>

              {/* Sessions Table (Read Only) */}
              <div className="m-table-container">
                <table className="m-table">
                  <thead>
                    <tr>
                      <th>Docente</th>
                      <th>Innovación</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map(s => {
                      const doc = docentes.find(d => d.id === s.dni);
                      // Skip pip or directivo sessions if any
                      if (doc && (doc.role === 'pip' || doc.role === 'directivo')) return null;

                      return (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <div style={{ width: '45px', height: '45px', background: '#F1F5F9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#475569' }}>
                                {doc?.nombre.charAt(0)}
                              </div>
                              <div>
                                <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>{doc?.nombre || 'Docente'}</p>
                                <p style={{ fontSize: '10px', color: '#94A3B8' }}>DNI {s.dni}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                             <p style={{ textDecoration: 'none', color: '#475569', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileStack size={14} color="#CBD5E1" /> {s.nombreArchivo}
                            </p>
                          </td>
                          <td>
                            <p style={{ fontWeight: 700 }}>{s.fecha}</p>
                            <p style={{ fontSize: '10px', color: '#94A3B8' }}>{s.hora}</p>
                          </td>
                          <td>
                            {s.estado === 'Aprobado' && <span className="badge-merinense" style={{ background: '#ECFDF5', color: '#10B981' }}>LOGRADO ⭐</span>}
                            {s.estado === 'Observado' && <span className="badge-merinense" style={{ background: '#FFFBEB', color: '#F59E0B' }}>OBSERVADO 💡</span>}
                            {s.estado === 'Enviado' && <span className="badge-merinense" style={{ background: '#FFF1F2', color: '#E11D48' }}>EN REVISIÓN 🔴</span>}
                            
                            {s.observaciones && s.estado !== 'Enviado' && (
                               <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748B', maxWidth: '250px', fontStyle: 'italic' }}>
                                "{s.observaciones}"
                               </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default DirectivoDashboard;
