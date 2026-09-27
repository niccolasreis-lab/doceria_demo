import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_ATTENDANTS } from '../constants/mockData';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  availableAttendants: UserProfile[];
  login: (email: string, pin?: string) => Promise<boolean>;
  selectAttendant: (attendantId: string) => void;
  logout: () => void;
  switchAttendant: (attendantId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Começa com o primeiro atendente logado para agilidade no salão
  const [user, setUser] = useState<UserProfile | null>(INITIAL_ATTENDANTS[0]);
  const [availableAttendants] = useState<UserProfile[]>(INITIAL_ATTENDANTS);

  const login = async (email: string, _pin?: string): Promise<boolean> => {
    const found = availableAttendants.find(
      (a) => a.email.toLowerCase() === email.toLowerCase().trim()
    );
    if (found && found.ativo) {
      setUser(found);
      return true;
    }
    return false;
  };

  const selectAttendant = (attendantId: string) => {
    const found = availableAttendants.find((a) => a.$id === attendantId);
    if (found) {
      setUser(found);
    }
  };

  const switchAttendant = (attendantId: string) => {
    selectAttendant(attendantId);
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user && user.role === UserRole.ATENDENTE,
      availableAttendants,
      login,
      selectAttendant,
      logout,
      switchAttendant,
    }),
    [user, availableAttendants]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
