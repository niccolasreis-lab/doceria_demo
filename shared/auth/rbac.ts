import { UserRole, UserProfile } from '../types';
import { Permission } from './types';

/**
 * Matriz de Permissoes por Papel de Usuario (RBAC)
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.COMANDA_VIEW,
    Permission.COMANDA_CREATE,
    Permission.COMANDA_ADD_ITEM,
    Permission.COMANDA_REQUEST_BILL,
    Permission.COMANDA_APPLY_DISCOUNT_STANDARD,
    Permission.COMANDA_APPLY_DISCOUNT_HIGH,
    Permission.COMANDA_CLOSE,
    Permission.COMANDA_CANCEL,
    Permission.PRODUTOS_VIEW,
    Permission.PRODUTOS_MANAGE,
    Permission.MESAS_VIEW,
    Permission.MESAS_MANAGE,
    Permission.USUARIOS_MANAGE,
    Permission.RELATORIOS_VIEW,
    Permission.DASHBOARD_ADMIN_VIEW,
    Permission.FECHAMENTO_CAIXA_VIEW,
    Permission.FECHAMENTO_CAIXA_EXECUTE,
    Permission.NOTIFICACOES_CAIXA,
    Permission.NOTIFICACOES_ADMIN,
  ],
  [UserRole.CAIXA]: [
    Permission.COMANDA_VIEW,
    Permission.COMANDA_CREATE,
    Permission.COMANDA_ADD_ITEM,
    Permission.COMANDA_REQUEST_BILL,
    Permission.COMANDA_APPLY_DISCOUNT_STANDARD,
    Permission.COMANDA_CLOSE,
    Permission.PRODUTOS_VIEW,
    Permission.MESAS_VIEW,
    Permission.NOTIFICACOES_CAIXA,
  ],
  [UserRole.ATENDENTE]: [
    Permission.COMANDA_VIEW,
    Permission.COMANDA_CREATE,
    Permission.COMANDA_ADD_ITEM,
    Permission.COMANDA_REQUEST_BILL,
    Permission.PRODUTOS_VIEW,
    Permission.MESAS_VIEW,
  ],
};

/**
 * Hierarquia de papeis para comparacoes de nivel
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 3,
  [UserRole.CAIXA]: 2,
  [UserRole.ATENDENTE]: 1,
};

/**
 * Verifica se um papel especifico possui uma permissao
 */
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * Verifica se o usuario (com base em seu perfil e status ativo) possui permissao
 */
export function canUserPerform(
  profile: UserProfile | undefined | null,
  permission: Permission
): boolean {
  if (!profile || !profile.ativo) {
    return false;
  }
  return hasPermission(profile.role, permission);
}

/**
 * Verifica se o perfil esta ativo e com papel valido
 */
export function isProfileActive(profile: UserProfile | undefined | null): boolean {
  return !!profile && profile.ativo === true && Object.values(UserRole).includes(profile.role);
}

/**
 * Verifica se o perfil do usuario tem um dos papeis permitidos
 */
export function checkRole(
  profile: UserProfile | undefined | null,
  allowedRoles: UserRole[]
): boolean {
  if (!profile || !profile.ativo) return false;
  return allowedRoles.includes(profile.role);
}

/**
 * Verifica se o usuario possui ao menos o nivel de papel exigido
 */
export function isRoleAtLeast(currentRole: UserRole, requiredRole: UserRole): boolean {
  const currentLevel = ROLE_HIERARCHY[currentRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return currentLevel >= requiredLevel;
}

/**
 * Retorna o nome de exibicao legivel do papel
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return 'Administrador';
    case UserRole.CAIXA:
      return 'Operador de Caixa';
    case UserRole.ATENDENTE:
      return 'Atendente de Salão';
    default:
      return 'Desconhecido';
  }
}
