import { describe, it, expect, beforeEach } from 'vitest';
import { UserRole } from '../../../shared/types';
import { MockAuthService, AuthStateManager, Permission } from '../../../shared/auth';

describe('Auth Service and AuthStateManager', () => {
  let mockAuthService: MockAuthService;
  let authManager: AuthStateManager;

  beforeEach(() => {
    mockAuthService = new MockAuthService();
    authManager = new AuthStateManager(mockAuthService);
  });

  it('deve realizar login com sucesso para admin', async () => {
    const session = await authManager.login({
      email: 'admin@doceriagilmar.com.br',
      password: 'any-password',
    });

    expect(session).toBeDefined();
    expect(session.profile.role).toBe(UserRole.ADMIN);
    expect(authManager.getState().isAuthenticated).toBe(true);
    expect(authManager.isAdmin()).toBe(true);
    expect(authManager.isCaixa()).toBe(true);
    expect(authManager.isAtendente()).toBe(true);
    expect(authManager.hasPermission(Permission.USUARIOS_MANAGE)).toBe(true);
  });

  it('deve realizar login para caixa com permissoes restritas', async () => {
    const session = await authManager.login({
      email: 'caixa@doceriagilmar.com.br',
      password: 'any-password',
    });

    expect(session.profile.role).toBe(UserRole.CAIXA);
    expect(authManager.isAdmin()).toBe(false);
    expect(authManager.isCaixa()).toBe(true);
    expect(authManager.hasPermission(Permission.COMANDA_CLOSE)).toBe(true);
    expect(authManager.hasPermission(Permission.USUARIOS_MANAGE)).toBe(false);
  });

  it('deve rejeitar login para usuario inexistente', async () => {
    await expect(
      authManager.login({
        email: 'naoexiste@doceria.com',
        password: '123',
      })
    ).rejects.toThrow('Credenciais inválidas');
  });

  it('deve rejeitar login para usuario inativo/bloqueado', async () => {
    await expect(
      authManager.login({
        email: 'bloqueado@doceriagilmar.com.br',
        password: '123',
      })
    ).rejects.toThrow('Usuário inativo ou bloqueado');
  });

  it('deve realizar logout e limpar estado', async () => {
    await authManager.login({
      email: 'admin@doceriagilmar.com.br',
      password: '123',
    });
    expect(authManager.getState().isAuthenticated).toBe(true);

    await authManager.logout();
    expect(authManager.getState().isAuthenticated).toBe(false);
    expect(authManager.getState().profile).toBeNull();
    expect(authManager.getState().session).toBeNull();
  });
});
