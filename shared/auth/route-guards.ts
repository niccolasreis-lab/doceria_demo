import { UserRole, UserProfile } from '../types';
import { RouteAccessDecision, RouteRule } from './types';
import { checkRole, isProfileActive } from './rbac';

/**
 * Mapeamento de rotas e papeis autorizados para o ecossistema Web e Mobile
 */
export const ROUTE_SECURITY_RULES: RouteRule[] = [
  // Rotas Publicas
  { prefix: '/login', requiresAuth: false, allowedRoles: [] },
  { prefix: '/esqueci-senha', requiresAuth: false, allowedRoles: [] },
  { prefix: '/recuperar-senha', requiresAuth: false, allowedRoles: [] },

  // Rotas Administrativas (Web)
  {
    prefix: '/admin',
    requiresAuth: true,
    allowedRoles: [UserRole.ADMIN],
  },
  {
    prefix: '/dashboard',
    requiresAuth: true,
    allowedRoles: [UserRole.ADMIN],
  },
  {
    prefix: '/relatorios',
    requiresAuth: true,
    allowedRoles: [UserRole.ADMIN],
  },
  {
    prefix: '/usuarios',
    requiresAuth: true,
    allowedRoles: [UserRole.ADMIN],
  },
  {
    prefix: '/fechamentos',
    requiresAuth: true,
    allowedRoles: [UserRole.ADMIN],
  },

  // Rotas de Caixa (Web / Mobile Caixa)
  {
    prefix: '/caixa',
    requiresAuth: true,
    allowedRoles: [UserRole.CAIXA, UserRole.ADMIN],
  },
  {
    prefix: '/fechamento-dia',
    requiresAuth: true,
    allowedRoles: [UserRole.CAIXA, UserRole.ADMIN],
  },

  // Rotas Operacionais / Atendente (Web & Mobile Salão)
  {
    prefix: '/atendente',
    requiresAuth: true,
    allowedRoles: [UserRole.ATENDENTE, UserRole.CAIXA, UserRole.ADMIN],
  },
  {
    prefix: '/mesas',
    requiresAuth: true,
    allowedRoles: [UserRole.ATENDENTE, UserRole.CAIXA, UserRole.ADMIN],
  },
  {
    prefix: '/comandas',
    requiresAuth: true,
    allowedRoles: [UserRole.ATENDENTE, UserRole.CAIXA, UserRole.ADMIN],
  },
  {
    prefix: '/mobile',
    requiresAuth: true,
    allowedRoles: [UserRole.ATENDENTE, UserRole.CAIXA, UserRole.ADMIN],
  },
];

/**
 * Retorna a rota padrao de redirecionamento para cada papel apos o login
 */
export function getDefaultRedirectForRole(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return '/admin';
    case UserRole.CAIXA:
      return '/caixa';
    case UserRole.ATENDENTE:
      return '/atendente';
    default:
      return '/login';
  }
}

/**
 * Avalia se o usuario autenticado tem permissao de acessar determinado caminho (pathname)
 */
export function evaluateRouteAccess(
  pathname: string,
  profile: UserProfile | null | undefined,
  isAuthenticated: boolean
): RouteAccessDecision {
  const normalizedPath = pathname.trim().toLowerCase();

  // Encontra a regra mais especifica que corresponde ao prefixo
  const matchedRule = ROUTE_SECURITY_RULES
    .filter(rule => normalizedPath.startsWith(rule.prefix.toLowerCase()))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  // Se nao houver regra especifica e a rota for a raiz '/', decide baseado no estado do usuario
  if (normalizedPath === '/' || normalizedPath === '') {
    if (!isAuthenticated || !profile) {
      return {
        isAllowed: false,
        reason: 'UNAUTHENTICATED',
        redirectTo: '/login',
      };
    }

    if (!profile.ativo) {
      return {
        isAllowed: false,
        reason: 'INACTIVE_USER',
        redirectTo: '/login?error=inactive',
      };
    }

    return {
      isAllowed: true,
      reason: 'ALLOWED',
      redirectTo: getDefaultRedirectForRole(profile.role),
    };
  }

  // Se a rota for publica
  if (matchedRule && !matchedRule.requiresAuth) {
    // Se ja estiver autenticado e tentar acessar /login, redireciona para a home do seu papel
    if (isAuthenticated && profile && isProfileActive(profile)) {
      return {
        isAllowed: false,
        reason: 'ALLOWED',
        redirectTo: getDefaultRedirectForRole(profile.role),
      };
    }

    return {
      isAllowed: true,
      reason: 'ALLOWED',
      redirectTo: pathname,
    };
  }

  // Rotas que exigem autenticacao
  if (!isAuthenticated || !profile) {
    return {
      isAllowed: false,
      reason: 'UNAUTHENTICATED',
      redirectTo: `/login?redirect=${encodeURIComponent(pathname)}`,
    };
  }

  // Usuario inativo / bloqueado
  if (!profile.ativo) {
    return {
      isAllowed: false,
      reason: 'INACTIVE_USER',
      redirectTo: '/login?error=inactive',
    };
  }

  // Se houver restricao de papéis
  if (matchedRule && matchedRule.allowedRoles.length > 0) {
    const hasRole = checkRole(profile, matchedRule.allowedRoles);
    if (!hasRole) {
      return {
        isAllowed: false,
        reason: 'INSUFFICIENT_ROLE',
        redirectTo: getDefaultRedirectForRole(profile.role),
      };
    }
  }

  // Acesso autorizado por padrao
  return {
    isAllowed: true,
    reason: 'ALLOWED',
    redirectTo: pathname,
  };
}
