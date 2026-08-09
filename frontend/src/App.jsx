import { useState } from 'react';
import Register from './pages/Register';
import Login from './pages/Login';

function App() {
  const [view, setView] = useState('register'); // Default to Register page first

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
