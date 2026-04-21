import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import DocenteDashboard from './components/DocenteDashboard';
import PIPDashboard from './components/PIPDashboard';
import DirectivoDashboard from './components/DirectivoDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('aip_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('aip_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('aip_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      {user.role === 'pip' ? (
        <PIPDashboard user={user} onLogout={handleLogout} />
      ) : user.role === 'directivo' ? (
        <DirectivoDashboard user={user} onLogout={handleLogout} />
      ) : (
        <DocenteDashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
