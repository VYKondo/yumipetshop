import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from './api';

interface User {
  id: string;
  email: string;
  role: string;
  petshopId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  petshopName: string;
  petshopPhone?: string;
  ownerName: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    // Decode JWT to get user info
    const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
    const userData: User = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      petshopId: payload.petshopId,
    };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const { data: tokens } = await api.post('/auth/register', data);
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);

    const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
    const userData: User = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      petshopId: payload.petshopId,
    };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
