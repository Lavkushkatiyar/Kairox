import { useState } from 'react';
import Register from './pages/Register';
import Login from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState('login'); // Default to Login first if not logged in

  if (loading) {
    return (
      <div className="auth-wrapper">
        <div className="neu-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <div className="spinner-sm" style={{ width: '40px', height: '40px', borderWidth: '3px', marginBottom: '16px' }}></div>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading session...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard user={user} onLogout={logout} />;
  }

  return (
    <main>
      {view === 'register' ? (
        <Register onSwitchToLogin={() => setView('login')} />
      ) : (
        <Login onSwitchToRegister={() => setView('register')} />
      )}
    </main>
  );
}

export default App;
