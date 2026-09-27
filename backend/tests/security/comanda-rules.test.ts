import { describe, it, expect } from 'vitest';
import { Comanda, ComandaStatus, UserProfile, UserRole } from '../../../shared/types';
import { validateComandaTransition, assertComandaTransitionAllowed } from '../../../shared/security';

describe('Comanda State Transitions and Security Rules', () => {
  const baseComanda: Comanda = {
    $id: 'cmd-101',
    codigo: 'CMD-101',
    mesa_id: 'mesa-01',
    mesa_numero: 1,
    atendente_id: 'atendente-01',
    atendente_nome: 'Lucas',
    status: ComandaStatus.ABERTA,
    subtotal_centavos: 4500,
    desconto_centavos: 0,
    total_centavos: 4500,
    aberta_em: new Date().toISOString(),
  };

  const atendente: UserProfile = {
    $id: 'atendente-01',
    nome: 'Lucas Atendente',
    email: 'atendente@doceria.com',
    role: UserRole.ATENDENTE,
    ativo: true,
  };

  const caixa: UserProfile = {
    $id: 'caixa-01',
    nome: 'Maria Caixa',
    email: 'caixa@doceria.com',
    role: UserRole.CAIXA,
    ativo: true,
  };

  const admin: UserProfile = {
    $id: 'admin-01',
    nome: 'Gilmar Admin',
    email: 'admin@doceria.com',
    role: UserRole.ADMIN,
    ativo: true,
  };

  it('permite transicao ABERTA -> PEDINDO_CONTA quando houver itens e valor positivo', () => {
    const res = validateComandaTransition(baseComanda, {
      targetStatus: ComandaStatus.PEDINDO_CONTA,
      userProfile: atendente,
      itensCount: 2,
      subtotalCentavos: 4500,
    });
    expect(res.allowed).toBe(true);
  });

  it('BLOQUEIA transicao para PEDINDO_CONTA se a comanda estiver vazia ou com subtotal zero', () => {
    const resEmpty = validateComandaTransition(baseComanda, {
      targetStatus: ComandaStatus.PEDINDO_CONTA,
      userProfile: atendente,
      itensCount: 0,
      subtotalCentavos: 0,
    });
    expect(resEmpty.allowed).toBe(false);
    expect(resEmpty.errorCode).toBe('CANNOT_REQUEST_BILL_EMPTY_TAB');
  });

  it('permite reabrir comanda de PEDINDO_CONTA -> ABERTA ao adicionar novo pedido', () => {
    const comandaPedindo: Comanda = {
      ...baseComanda,
      status: ComandaStatus.PEDINDO_CONTA,
    };

    const res = validateComandaTransition(comandaPedindo, {
      targetStatus: ComandaStatus.ABERTA,
      userProfile: atendente,
      itensCount: 2,
      subtotalCentavos: 4500,
    });
    expect(res.allowed).toBe(true);
  });

  it('permite fechamento como PAGA apenas por Caixa ou Admin e com pagamento confirmado', () => {
    // Tentativa do atendente deve falhar
    const resAtendente = validateComandaTransition(baseComanda, {
      targetStatus: ComandaStatus.PAGA,
      userProfile: atendente,
      itensCount: 2,
      subtotalCentavos: 4500,
      isPaid: true,
    });
    expect(resAtendente.allowed).toBe(false);
    expect(resAtendente.errorCode).toBe('UNAUTHORIZED_ACTION');

    // Tentativa do Caixa com pagamento confirmado deve passar
    const resCaixa = validateComandaTransition(baseComanda, {
      targetStatus: ComandaStatus.PAGA,
      userProfile: caixa,
      itensCount: 2,
      subtotalCentavos: 4500,
      isPaid: true,
    });
    expect(resCaixa.allowed).toBe(true);

    // Tentativa sem pagamento confirmado deve falhar
    const resUnpaid = validateComandaTransition(baseComanda, {
      targetStatus: ComandaStatus.PAGA,
      userProfile: caixa,
      itensCount: 2,
      subtotalCentavos: 4500,
      isPaid: false,
    });
    expect(resUnpaid.allowed).toBe(false);
    expect(resUnpaid.errorCode).toBe('UNPAID_TAB');
  });

  it('permite cancelamento apenas por Admin e exigindo motivo', () => {
    const resCaixa = validateComandaTransition(baseComanda, {
      targetStatus: ComandaStatus.CANCELADA,
      userProfile: caixa,
      itensCount: 2,
      subtotalCentavos: 4500,
      motivoCancelamento: 'Cliente desistiu',
    });
    expect(resCaixa.allowed).toBe(false);
    expect(resCaixa.errorCode).toBe('UNAUTHORIZED_ACTION');

    const resAdminSemMotivo = validateComandaTransition(baseComanda, {
      targetStatus: ComandaStatus.CANCELADA,
      userProfile: admin,
      itensCount: 2,
      subtotalCentavos: 4500,
      motivoCancelamento: '',
    });
    expect(resAdminSemMotivo.allowed).toBe(false);
    expect(resAdminSemMotivo.errorCode).toBe('MISSING_CANCELLATION_REASON');

    const resAdmin = validateComandaTransition(baseComanda, {
      targetStatus: ComandaStatus.CANCELADA,
      userProfile: admin,
      itensCount: 2,
      subtotalCentavos: 4500,
      motivoCancelamento: 'Mesa aberta por engano',
    });
    expect(resAdmin.allowed).toBe(true);
  });

  it('GARANTE IMUTABILIDADE de comandas já PAGAS ou CANCELADAS', () => {
    const comandaPaga: Comanda = {
      ...baseComanda,
      status: ComandaStatus.PAGA,
    };

    expect(
      validateComandaTransition(comandaPaga, {
        targetStatus: ComandaStatus.ABERTA,
        userProfile: admin,
        itensCount: 2,
        subtotalCentavos: 4500,
      }).allowed
    ).toBe(false);

    expect(
      validateComandaTransition(comandaPaga, {
        targetStatus: ComandaStatus.CANCELADA,
        userProfile: admin,
        itensCount: 2,
        subtotalCentavos: 4500,
        motivoCancelamento: 'tentativa',
      }).allowed
    ).toBe(false);

    const comandaCancelada: Comanda = {
      ...baseComanda,
      status: ComandaStatus.CANCELADA,
    };

    expect(
      validateComandaTransition(comandaCancelada, {
        targetStatus: ComandaStatus.ABERTA,
        userProfile: admin,
        itensCount: 2,
        subtotalCentavos: 4500,
      }).allowed
    ).toBe(false);
  });

  it('assertComandaTransitionAllowed deve lançar exceção em caso de violação', () => {
    expect(() => {
      assertComandaTransitionAllowed(baseComanda, {
        targetStatus: ComandaStatus.PEDINDO_CONTA,
        userProfile: atendente,
        itensCount: 0,
        subtotalCentavos: 0,
      });
    }).toThrow('Não é possível solicitar a conta');
  });
});
