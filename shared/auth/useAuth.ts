import { useEffect, useState, useMemo, useCallback } from 'react';
import { UserProfile, UserRole } from '../types';
import { AuthCredentials, AuthSession, Permission, RouteAccessDecision } from './types';
import { AuthStateManager, AuthState } from './auth-state';
import { AuthServicePort, MockAuthService } from './auth-service';
import { hasPermission as rbacHasPermission, canUserPerform } from './rbac';
import { evaluateRouteAccess } from './route-guards';

// Instancia singleton padrao para a aplicacao
let globalAuthStateManager: AuthStateManager | null = null;

export function getGlobalAuthStateManager(customAuthService?: AuthServicePort): AuthStateManager {
  if (!globalAuthStateManager) {
    globalAuthStateManager = new AuthStateManager(customAuthService || new MockAuthService());
    // Auto-init no runtime
    globalAuthStateManager.init().catch(err => {
      console.warn('Auto-init AuthStateManager warning:', err);
    });
  }
  return globalAuthStateManager;
}

export function setGlobalAuthStateManager(manager: AuthStateManager): void {
  globalAuthStateManager = manager;
}

export interface UseAuthReturn extends AuthState {
  role: UserRole | null;
  isAdmin: boolean;
  isCaixa: boolean;
  isAtendente: boolean;
  login: (credentials: AuthCredentials) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  hasPermission: (permission: Permission) => boolean;
  canAccessRoute: (pathname: string) => RouteAccessDecision;
  checkRole: (allowedRoles: UserRole[]) => boolean;
}

/**
 * Hook universal de autenticacao e controle de acesso para React Web (Next.js) e React Native (Expo)
 */
export function useAuth(customAuthService?: AuthServicePort): UseAuthReturn {
  const manager = useMemo(() => {
    if (customAuthService) {
      return new AuthStateManager(customAuthService);
    }
    return getGlobalAuthStateManager();
  }, [customAuthService]);

  const [state, setState] = useState<AuthState>(manager.getState());

  useEffect(() => {
    const unsubscribe = manager.subscribe(nextState => {
      setState(nextState);
    });
    return () => {
      unsubscribe();
    };
  }, [manager]);

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      return manager.login(credentials);
    },
    [manager]
  );

  const logout = useCallback(async () => {
    return manager.logout();
  }, [manager]);

  const refreshProfile = useCallback(async () => {
    return manager.refreshProfile();
  }, [manager]);

  const checkPerm = useCallback(
    (permission: Permission) => {
      return canUserPerform(state.profile, permission);
    },
    [state.profile]
  );

  const checkRoute = useCallback(
    (pathname: string) => {
      return evaluateRouteAccess(pathname, state.profile, state.isAuthenticated);
    },
    [state.profile, state.isAuthenticated]
  );

  const checkAllowedRole = useCallback(
    (allowedRoles: UserRole[]) => {
      if (!state.profile || !state.profile.ativo) return false;
      return allowedRoles.includes(state.profile.role);
    },
    [state.profile]
  );

  const role = state.profile?.role ?? null;
  const isAdmin = role === UserRole.ADMIN && state.profile?.ativo === true;
  const isCaixa =
    (role === UserRole.CAIXA || role === UserRole.ADMIN) && state.profile?.ativo === true;
  const isAtendente = !!state.profile && state.profile.ativo === true;

  return {
    ...state,
    role,
    isAdmin,
    isCaixa,
    isAtendente,
    login,
    logout,
    refreshProfile,
    hasPermission: checkPerm,
    canAccessRoute: checkRoute,
    checkRole: checkAllowedRole,
  };
}
