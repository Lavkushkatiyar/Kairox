import { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      setSuccess('Account created successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account. Please try again.');
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
      <div className="neu-card register-card">
        <h2 className="card-title">Create Account</h2>

        {error && (
          <div className="alert-banner alert-danger">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-banner alert-success">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="neu-input-wrapper">
              <span className="input-icon">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                className="neu-input"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

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
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="neu-input-wrapper">
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                className="neu-input"
                placeholder="Create a password"
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

          {/* Confirm Password */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label">Confirm Password</label>
            <div className="neu-input-wrapper">
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                className="neu-input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="neu-button" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner-sm"></div>
                <span>Creating Account...</span>
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>

      {/* Footer Link */}
      <div className="auth-footer">
        Already have an account?{' '}
        <span className="auth-footer-link" onClick={onSwitchToLogin}>
          Sign In
        </span>
      </div>
    </div>
  );
};

export default Register;
