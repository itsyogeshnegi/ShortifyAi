import { createContext, useContext, useMemo, useState } from 'react';
import { api } from '../api/http.js';

const AuthContext = createContext(null);
const singleUser = {
  id: 'local-owner',
  name: 'ShortifyAI Admin',
  email: 'admin@shortifyai.local',
  role: 'super-admin',
  plan: 'Admin',
  downloads: 0
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('shortifyai_token') || 'single-user-mode');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('shortifyai_user');
    return saved ? JSON.parse(saved) : singleUser;
  });

  const saveSession = (payload) => {
    localStorage.setItem('shortifyai_token', payload.token);
    localStorage.setItem('shortifyai_user', JSON.stringify(payload.user));
    setToken(payload.token);
    setUser(payload.user);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    saveSession(data);
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    saveSession(data);
  };

  const logout = () => {
    localStorage.removeItem('shortifyai_token');
    localStorage.removeItem('shortifyai_user');
    setToken('single-user-mode');
    setUser(singleUser);
  };

  const value = useMemo(() => ({ token, user, login, register, logout, isAuthed: Boolean(token) }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
