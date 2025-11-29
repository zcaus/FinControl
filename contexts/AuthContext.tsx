import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { storage } from '../services/storage';

interface AuthContextType extends AuthState {
  login: (email: string) => void;
  register: (name: string, email: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    const user = storage.getUser();
    if (user) {
      setAuth({ user, isAuthenticated: true });
    }
  }, []);

  const login = (email: string) => {
    // Simulating login - in real app check password
    // For demo, we just retrieve the user if they exist or mock it
    const storedUser = storage.getUser();
    if (storedUser && storedUser.email === email) {
      setAuth({ user: storedUser, isAuthenticated: true });
    } else {
       // Mock login for demo purposes even if not registered perfectly
       const mockUser: User = { 
         name: 'User', 
         email,
         preferences: { language: 'pt-BR', notifications: true }
       };
       storage.saveUser(mockUser);
       setAuth({ user: mockUser, isAuthenticated: true });
    }
  };

  const register = (name: string, email: string) => {
    const newUser: User = { 
      name, 
      email,
      preferences: { language: 'pt-BR', notifications: true } 
    };
    storage.saveUser(newUser);
    setAuth({ user: newUser, isAuthenticated: true });
  };

  const logout = () => {
    storage.clearUser();
    setAuth({ user: null, isAuthenticated: false });
  };

  const updateProfile = (data: Partial<User>) => {
    if (!auth.user) return;
    const updatedUser = { ...auth.user, ...data };
    storage.saveUser(updatedUser);
    setAuth({ user: updatedUser, isAuthenticated: true });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};