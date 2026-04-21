import React, { useState } from 'react';
import axios from 'axios';
import { Cpu, Loader2, Info, Users, GraduationCap, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = ({ onLogin }) => {
  const [roleMode, setRoleMode] = useState('docente'); // 'docente' or 'pip'
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check manual PIP override
    if (roleMode === 'pip') {
      if (password === 'Merino2026') {
        setError('');
        onLogin({ role: 'pip', nombre: 'Coordinador PIP', id: 'admin-pip' });
      } else {
        setError('Clave de acceso incorrecta. Intenta nuevamente.');
      }
      return;
    }

    if (roleMode === 'directivo') {
      if (password === 'merino2026') {
        setError('');
        onLogin({ role: 'directivo', nombre: 'Directivo Institucional', id: 'admin-dir' });
      } else {
        setError('Clave de acceso incorrecta. Intenta nuevamente.');
      }
      return;
    }

    if (dni.length !== 8) {
      setError('El DNI debe tener 8 números. Verifiquemos e intentemos de nuevo.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('https://backend-aip.onrender.com/api/auth/login', { dni, password });
      const user = response.data;

      // Validación de rol estricta
      if (roleMode === 'docente' && user.role !== 'docente') {
        setError('Este acceso es exclusivo para Docentes.');
        return;
      }
      if (roleMode === 'directivo' && user.role !== 'directivo') {
        setError('Este acceso es exclusivo para el Panel Directivo.');
        return;
      }

      onLogin(user);
    } catch (err) {
      setError(err.response?.data?.error || 'No pudimos validar tu acceso. ¿Revisamos los datos?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background Decorations */}
      <div className="bg-decoration"></div>
      <div className="bg-decoration-2"></div>
      
      {/* Top Title - Added according to new request */}
      <div style={{ textAlign: 'center', marginBottom: '1.2rem', zIndex: 10 }}>
        <h1 style={{ 
          color: 'white', 
          fontSize: 'clamp(2rem, 4vw, 3.2rem)', 
          fontWeight: 900, 
          letterSpacing: '-1px', 
          lineHeight: '1.1',
          fontFamily: "'Outfit', sans-serif"
        }}>
          Aula de Innovación<br />
          <span style={{ 
            color: '#00AEEF', 
            textShadow: '0 0 15px rgba(0,174,239,0.8), 0 0 30px rgba(0,174,239,0.4)',
            display: 'block',
            marginTop: '-5px'
          }}>Pedagógica</span>
        </h1>
      </div>

      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className="login-card"
      >
        {/* Role Selector Tabs */}
        <div className="role-selector" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
          <button 
            onClick={() => setRoleMode('docente')}
            className={`role-tab ${roleMode === 'docente' ? 'active' : ''}`}
            style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}
          >
             Docente
          </button>
          <button 
            onClick={() => setRoleMode('pip')}
            className={`role-tab ${roleMode === 'pip' ? 'active pip-mode' : ''}`}
            style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}
          >
             PIP
          </button>
          <button 
            onClick={() => setRoleMode('directivo')}
            className={`role-tab ${roleMode === 'directivo' ? 'active directivo-mode' : ''}`}
            style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, background: roleMode === 'directivo' ? '#FEF3C7' : 'transparent', color: roleMode === 'directivo' ? '#D97706' : '#94A3B8' }}
          >
             Directivo
          </button>
        </div>

        {/* Header Section Dynamic */}
        <AnimatePresence mode="wait">
          <motion.div
            key={roleMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="header-content"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div className={`login-logo-container ${roleMode === 'pip' ? 'pip-logo' : ''}`}>
              {roleMode === 'docente' ? <Cpu size={24} /> : <Users size={24} />}
            </div>
            
            <p className={`hashtag-merinense ${roleMode === 'pip' ? 'pip-accent' : roleMode === 'directivo' ? 'text-amber-500' : ''}`} style={{ fontSize: '8px', marginBottom: '0.1rem', color: roleMode === 'directivo' ? '#D97706' : undefined }}>
              {roleMode === 'docente' ? '#SomosMerinenses' : roleMode === 'directivo' ? '#GestiónDirectiva' : '#GestiónMerinense'}
            </p>
            <h1 className="login-title" style={{ marginBottom: '0.8rem', color: roleMode === 'directivo' ? '#D97706' : undefined }}>
              {roleMode === 'docente' ? 'Gestor de Sesiones AIP Merinense' : roleMode === 'directivo' ? 'Panel Directivo' : 'Gestión AIP Sesiones'}
            </h1>
          </motion.div>
        </AnimatePresence>
        
        {/* Form Section */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {roleMode === 'docente' && (
            <div className="form-group">
              <label className="form-label">Identificación Institucional</label>
              <input 
                type="text" 
                placeholder="Ingresa tu DNI"
                className="form-input"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Clave de Acceso</label>
            <input 
              type="password" 
              placeholder="Ingresa tu contraseña"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`btn-login ${roleMode === 'pip' ? 'pip-btn' : ''}`}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <Loader2 className="animate-spin" size={20} />
                <span>Sincronizando...</span>
              </div>
            ) : (
              'Ingresar a AIP Sesiones'
            )}
          </button>
          
          <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
             <a 
               href="https://wa.me/51978979222?text=Hola%2C%20tengo%20problemas%20con%20mi%20acceso%20a%20AIP%20Sesiones.%20¿Podrían%20ayudarme%3F"
               target="_blank"
               rel="noopener noreferrer"
               style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', marginBottom: '0.4rem', textDecoration: 'none', display: 'inline-block' }}
             >
               ¿Tienes problemas con tu acceso?
             </a>
             
             <p className="lema-merinense" style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#1e293b' }}>
               Estudio • Disciplina • Superación
             </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="login-error"
              style={{ padding: '1rem', marginTop: '1rem' }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </form>

        {/* Footer Identity & Credits */}
        <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
           <p style={{ fontSize: '8px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>
             Creado por PIP. Edwin Ronald Cruz Ruiz
           </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
