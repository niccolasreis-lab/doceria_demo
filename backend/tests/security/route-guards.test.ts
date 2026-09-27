import { describe, it, expect } from 'vitest';
import { UserRole, UserProfile } from '../../../shared/types';
import { evaluateRouteAccess } from '../../../shared/auth';

describe('Route Access Guards & Security Rules', () => {
  const admin: UserProfile = {
    $id: 'admin-1',
    nome: 'Admin User',
    email: 'admin@doceria.com',
    role: UserRole.ADMIN,
    ativo: true,
  };

  const caixa: UserProfile = {
    $id: 'caixa-1',
    nome: 'Caixa User',
    email: 'caixa@doceria.com',
    role: UserRole.CAIXA,
    ativo: true,
  };

  const atendente: UserProfile = {
    $id: 'atendente-1',
    nome: 'Atendente User',
    email: 'atendente@doceria.com',
    role: UserRole.ATENDENTE,
    ativo: true,
  };

  const inactiveUser: UserProfile = {
    ...admin,
    ativo: false,
  };

  it('permite acesso a rotas publicas sem autenticacao', () => {
    const decision = evaluateRouteAccess('/login', null, false);
    expect(decision.isAllowed).toBe(true);
    expect(decision.redirectTo).toBe('/login');
  });

  it('redireciona usuario autenticado que acessa /login para sua home', () => {
    const decisionAdmin = evaluateRouteAccess('/login', admin, true);
    expect(decisionAdmin.isAllowed).toBe(false);
    expect(decisionAdmin.redirectTo).toBe('/admin');

    const decisionCaixa = evaluateRouteAccess('/login', caixa, true);
    expect(decisionCaixa.isAllowed).toBe(false);
    expect(decisionCaixa.redirectTo).toBe('/caixa');

    const decisionAtendente = evaluateRouteAccess('/login', atendente, true);
    expect(decisionAtendente.isAllowed).toBe(false);
    expect(decisionAtendente.redirectTo).toBe('/atendente');
  });

  it('bloqueia acesso a rotas protegidas para visitantes nao autenticados', () => {
    const decision = evaluateRouteAccess('/admin/dashboard', null, false);
    expect(decision.isAllowed).toBe(false);
    expect(decision.reason).toBe('UNAUTHENTICATED');
    expect(decision.redirectTo).toContain('/login?redirect=');
  });

  it('bloqueia acesso para usuarios inativos', () => {
    const decision = evaluateRouteAccess('/admin', inactiveUser, true);
    expect(decision.isAllowed).toBe(false);
    expect(decision.reason).toBe('INACTIVE_USER');
    expect(decision.redirectTo).toBe('/login?error=inactive');
  });

  it('permite apenas Admin acessar rotas /admin, /dashboard, /usuarios, /fechamentos', () => {
    expect(evaluateRouteAccess('/admin', admin, true).isAllowed).toBe(true);
    expect(evaluateRouteAccess('/admin/usuarios', admin, true).isAllowed).toBe(true);
    expect(evaluateRouteAccess('/relatorios', admin, true).isAllowed).toBe(true);
    expect(evaluateRouteAccess('/fechamentos', admin, true).isAllowed).toBe(true);

    const caixaAttempt = evaluateRouteAccess('/admin', caixa, true);
    expect(caixaAttempt.isAllowed).toBe(false);
    expect(caixaAttempt.reason).toBe('INSUFFICIENT_ROLE');
    expect(caixaAttempt.redirectTo).toBe('/caixa');

    const atendenteAttempt = evaluateRouteAccess('/admin', atendente, true);
    expect(atendenteAttempt.isAllowed).toBe(false);
    expect(atendenteAttempt.reason).toBe('INSUFFICIENT_ROLE');
    expect(atendenteAttempt.redirectTo).toBe('/atendente');
  });

  it('permite Caixa e Admin acessarem /caixa e /fechamento-dia', () => {
    expect(evaluateRouteAccess('/caixa', caixa, true).isAllowed).toBe(true);
    expect(evaluateRouteAccess('/caixa', admin, true).isAllowed).toBe(true);

    const atendenteCaixa = evaluateRouteAccess('/caixa', atendente, true);
    expect(atendenteCaixa.isAllowed).toBe(false);
    expect(atendenteCaixa.reason).toBe('INSUFFICIENT_ROLE');
  });

  it('permite Atendente, Caixa e Admin acessarem rotas operacionais /mesas, /comandas, /mobile', () => {
    expect(evaluateRouteAccess('/mesas', atendente, true).isAllowed).toBe(true);
    expect(evaluateRouteAccess('/comandas', atendente, true).isAllowed).toBe(true);
    expect(evaluateRouteAccess('/mobile', atendente, true).isAllowed).toBe(true);

    expect(evaluateRouteAccess('/mesas', caixa, true).isAllowed).toBe(true);
    expect(evaluateRouteAccess('/mesas', admin, true).isAllowed).toBe(true);
  });
});
