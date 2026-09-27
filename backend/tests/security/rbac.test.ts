import { describe, it, expect } from 'vitest';
import {
  UserRole,
  UserProfile,
} from '../../../shared/types';
import {
  Permission,
  ROLE_PERMISSIONS,
  hasPermission,
  canUserPerform,
  isProfileActive,
  checkRole,
  isRoleAtLeast,
  getRoleDisplayName,
} from '../../../shared/auth';

describe('RBAC & Permission System', () => {
  const adminProfile: UserProfile = {
    $id: 'user-admin',
    nome: 'Gilmar Admin',
    email: 'admin@doceria.com',
    role: UserRole.ADMIN,
    ativo: true,
  };

  const caixaProfile: UserProfile = {
    $id: 'user-caixa',
    nome: 'Maria Caixa',
    email: 'caixa@doceria.com',
    role: UserRole.CAIXA,
    ativo: true,
  };

  const atendenteProfile: UserProfile = {
    $id: 'user-atendente',
    nome: 'Lucas Atendente',
    email: 'atendente@doceria.com',
    role: UserRole.ATENDENTE,
    ativo: true,
  };

  const inactiveAdmin: UserProfile = {
    ...adminProfile,
    $id: 'inactive-admin',
    ativo: false,
  };

  it('deve validar permissoes exclusivas do Admin', () => {
    expect(hasPermission(UserRole.ADMIN, Permission.USUARIOS_MANAGE)).toBe(true);
    expect(hasPermission(UserRole.ADMIN, Permission.FECHAMENTO_CAIXA_EXECUTE)).toBe(true);
    expect(hasPermission(UserRole.ADMIN, Permission.COMANDA_CANCEL)).toBe(true);
    expect(hasPermission(UserRole.ADMIN, Permission.COMANDA_APPLY_DISCOUNT_HIGH)).toBe(true);

    expect(hasPermission(UserRole.CAIXA, Permission.USUARIOS_MANAGE)).toBe(false);
    expect(hasPermission(UserRole.CAIXA, Permission.FECHAMENTO_CAIXA_EXECUTE)).toBe(false);
    expect(hasPermission(UserRole.CAIXA, Permission.COMANDA_CANCEL)).toBe(false);

    expect(hasPermission(UserRole.ATENDENTE, Permission.USUARIOS_MANAGE)).toBe(false);
    expect(hasPermission(UserRole.ATENDENTE, Permission.FECHAMENTO_CAIXA_EXECUTE)).toBe(false);
  });

  it('deve validar permissoes do Caixa', () => {
    expect(hasPermission(UserRole.CAIXA, Permission.COMANDA_CLOSE)).toBe(true);
    expect(hasPermission(UserRole.CAIXA, Permission.COMANDA_APPLY_DISCOUNT_STANDARD)).toBe(true);
    expect(hasPermission(UserRole.CAIXA, Permission.NOTIFICACOES_CAIXA)).toBe(true);

    expect(hasPermission(UserRole.ATENDENTE, Permission.COMANDA_CLOSE)).toBe(false);
    expect(hasPermission(UserRole.ATENDENTE, Permission.COMANDA_APPLY_DISCOUNT_STANDARD)).toBe(false);
  });

  it('deve validar permissoes operacionais do Atendente', () => {
    expect(hasPermission(UserRole.ATENDENTE, Permission.COMANDA_CREATE)).toBe(true);
    expect(hasPermission(UserRole.ATENDENTE, Permission.COMANDA_ADD_ITEM)).toBe(true);
    expect(hasPermission(UserRole.ATENDENTE, Permission.COMANDA_REQUEST_BILL)).toBe(true);
    expect(hasPermission(UserRole.ATENDENTE, Permission.MESAS_VIEW)).toBe(true);
    expect(hasPermission(UserRole.ATENDENTE, Permission.PRODUTOS_VIEW)).toBe(true);
  });

  it('deve bloquear qualquer permissao para usuarios inativos', () => {
    expect(canUserPerform(inactiveAdmin, Permission.USUARIOS_MANAGE)).toBe(false);
    expect(canUserPerform(inactiveAdmin, Permission.COMANDA_VIEW)).toBe(false);
    expect(canUserPerform(null, Permission.COMANDA_VIEW)).toBe(false);
    expect(canUserPerform(undefined, Permission.COMANDA_VIEW)).toBe(false);
  });

  it('deve validar isProfileActive', () => {
    expect(isProfileActive(adminProfile)).toBe(true);
    expect(isProfileActive(caixaProfile)).toBe(true);
    expect(isProfileActive(atendenteProfile)).toBe(true);
    expect(isProfileActive(inactiveAdmin)).toBe(false);
    expect(isProfileActive(null)).toBe(false);
    expect(isProfileActive(undefined)).toBe(false);
  });

  it('deve validar checkRole', () => {
    expect(checkRole(adminProfile, [UserRole.ADMIN])).toBe(true);
    expect(checkRole(adminProfile, [UserRole.CAIXA, UserRole.ADMIN])).toBe(true);
    expect(checkRole(caixaProfile, [UserRole.CAIXA, UserRole.ADMIN])).toBe(true);
    expect(checkRole(atendenteProfile, [UserRole.CAIXA, UserRole.ADMIN])).toBe(false);
    expect(checkRole(inactiveAdmin, [UserRole.ADMIN])).toBe(false);
  });

  it('deve validar hierarquia de papeis isRoleAtLeast', () => {
    expect(isRoleAtLeast(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
    expect(isRoleAtLeast(UserRole.ADMIN, UserRole.CAIXA)).toBe(true);
    expect(isRoleAtLeast(UserRole.ADMIN, UserRole.ATENDENTE)).toBe(true);

    expect(isRoleAtLeast(UserRole.CAIXA, UserRole.ADMIN)).toBe(false);
    expect(isRoleAtLeast(UserRole.CAIXA, UserRole.CAIXA)).toBe(true);
    expect(isRoleAtLeast(UserRole.CAIXA, UserRole.ATENDENTE)).toBe(true);

    expect(isRoleAtLeast(UserRole.ATENDENTE, UserRole.ADMIN)).toBe(false);
    expect(isRoleAtLeast(UserRole.ATENDENTE, UserRole.CAIXA)).toBe(false);
    expect(isRoleAtLeast(UserRole.ATENDENTE, UserRole.ATENDENTE)).toBe(true);
  });

  it('deve retornar nomes legiveis dos papeis', () => {
    expect(getRoleDisplayName(UserRole.ADMIN)).toBe('Administrador');
    expect(getRoleDisplayName(UserRole.CAIXA)).toBe('Operador de Caixa');
    expect(getRoleDisplayName(UserRole.ATENDENTE)).toBe('Atendente de Salão');
  });
});
