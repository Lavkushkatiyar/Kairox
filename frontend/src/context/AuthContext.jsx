import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('kairox_access_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiClient.get('/auth/me');
        setUser(response.data);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [token]);

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { access_token, refresh_token } = response.data;
    
    localStorage.setItem('kairox_access_token', access_token);
    if (refresh_token) {
      localStorage.setItem('kairox_refresh_token', refresh_token);
    }
    
    setToken(access_token);
    
    // Fetch profile
    const profileRes = await apiClient.get('/auth/me');
    setUser(profileRes.data);
    return profileRes.data;
  };

  const register = async (name, email, password) => {
    const response = await apiClient.post('/auth/register', { name, email, password });
    const { access_token, refresh_token } = response.data;
    
    localStorage.setItem('kairox_access_token', access_token);
    if (refresh_token) {
      localStorage.setItem('kairox_refresh_token', refresh_token);
    }
    
    setToken(access_token);
    
    const profileRes = await apiClient.get('/auth/me');
    setUser(profileRes.data);
    return profileRes.data;
  };

  const logout = () => {
    localStorage.removeItem('kairox_access_token');
    localStorage.removeItem('kairox_refresh_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
