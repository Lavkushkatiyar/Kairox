import { useState } from 'react';
import Register from './pages/Register';
import Login from './pages/Login';
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
    return (
      <div className="auth-wrapper">
        <div className="brand-header">
          <h1 className="brand-title">Kairox</h1>
          <p className="brand-subtitle">Thought → Execution</p>
        </div>
        <div className="neu-card" style={{ textAlign: 'center' }}>
          <h2 className="card-title">Welcome back!</h2>
          <div className="user-profile" style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-color)', borderRadius: '16px', boxShadow: 'var(--shadow-inset)' }}>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-dark)', marginBottom: '4px' }}>{user.name || user.email}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{user.email}</p>
          </div>
          <button onClick={logout} className="neu-button" style={{ color: 'var(--danger-color)', justifyContent: 'center' }}>
            Sign Out
          </button>
        </div>
      </div>
    );
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
