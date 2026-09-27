"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, UserRole } from "@/types";
import { INITIAL_USERS } from "./mock-data";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginAs: (role: UserRole) => void;
  loginWithCredentials: (emailOrPin: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  canAccessAdmin: boolean;
  canAccessCashier: boolean;
  canApproveHighDiscounts: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "srgilmar_current_user_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        // Default login as CAIXA for quick access
        const defaultUser = INITIAL_USERS.find((u) => u.role === "CAIXA") || INITIAL_USERS[0];
        setUser(defaultUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultUser));
      }
    } catch {
      setUser(INITIAL_USERS[1]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAs = (role: UserRole) => {
    const targetUser = INITIAL_USERS.find((u) => u.role === role) || INITIAL_USERS[0];
    setUser(targetUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(targetUser));
    }
  };

  const loginWithCredentials = async (emailOrPin: string): Promise<boolean> => {
    const trimmed = emailOrPin.trim().toLowerCase();
    const found = INITIAL_USERS.find(
      (u) =>
        u.email.toLowerCase() === trimmed ||
        u.pin === trimmed ||
        u.name.toLowerCase().includes(trimmed)
    );

    if (found) {
      setUser(found);
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(found));
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const canAccessAdmin = user?.role === "ADMIN";
  const canAccessCashier = user?.role === "CAIXA" || user?.role === "ADMIN";
  const canApproveHighDiscounts = user?.role === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginAs,
        loginWithCredentials,
        logout,
        hasRole,
        canAccessAdmin,
        canAccessCashier,
        canApproveHighDiscounts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
