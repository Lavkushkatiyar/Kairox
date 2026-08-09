import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';

const Login = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });
      const { access_token, refresh_token } = response.data;
      localStorage.setItem('kairox_access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('kairox_refresh_token', refresh_token);
      }
      alert('Signed in successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Brand Header */}
      <div className="brand-header">
        <h1 className="brand-title">Kairox</h1>
        <p className="brand-subtitle">Thought → Execution</p>
      </div>

      {/* Neumorphic Card */}
      <div className="neu-card">
        <h2 className="card-title">Sign In</h2>

        {error && (
          <div className="alert-banner alert-danger">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email Address */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="neu-input-wrapper">
              <span className="input-icon">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                className="neu-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <div className="form-label-row">
              <label className="form-label">Password</label>
              <a href="#forgot" className="forgot-link" onClick={(e) => { e.preventDefault(); alert('Password reset flow coming soon!'); }}>
                Forgot?
              </a>
            </div>
            <div className="neu-input-wrapper">
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="neu-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="neu-button" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner-sm"></div>
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      {/* Footer Link */}
      <div className="auth-footer">
        Don't have an account?{' '}
        <span className="auth-footer-link" onClick={onSwitchToRegister}>
          Create Account
        </span>
      </div>
    </div>
  );
};

export default Login;
