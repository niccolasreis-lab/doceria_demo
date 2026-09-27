import { Comanda, ComandaStatus, UserProfile, UserRole } from '../types';
import { canUserPerform } from '../auth/rbac';
import { Permission } from '../auth/types';

export interface ComandaTransitionContext {
  targetStatus: ComandaStatus;
  userProfile: UserProfile;
  itensCount: number;
  subtotalCentavos: number;
  isPaid?: boolean;
  motivoCancelamento?: string;
}

export interface TransitionValidationResult {
  allowed: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Matriz de transicoes permitidas por status atual
 */
export const ALLOWED_TRANSITIONS: Record<ComandaStatus, readonly ComandaStatus[]> = {
  [ComandaStatus.ABERTA]: [ComandaStatus.PEDINDO_CONTA, ComandaStatus.PAGA, ComandaStatus.CANCELADA],
  [ComandaStatus.PEDINDO_CONTA]: [ComandaStatus.ABERTA, ComandaStatus.PAGA, ComandaStatus.CANCELADA],
  [ComandaStatus.PAGA]: [],      // Estado terminal imutável
  [ComandaStatus.CANCELADA]: [], // Estado terminal imutável
};

/**
 * Validador rigoroso de transições de status de comanda com verificação de segurança e papéis
 */
export function validateComandaTransition(
  currentComanda: Comanda,
  context: ComandaTransitionContext
): TransitionValidationResult {
  const { targetStatus, userProfile, itensCount, subtotalCentavos, isPaid } = context;

  // 1. Verificacao de usuario ativo
  if (!userProfile || !userProfile.ativo) {
    return {
      allowed: false,
      errorCode: 'INACTIVE_USER',
      errorMessage: 'Usuário inativo ou não autenticado.',
    };
  }

  // 2. Verificacao de transicao para o mesmo status
  if (currentComanda.status === targetStatus) {
    return {
      allowed: false,
      errorCode: 'SAME_STATUS',
      errorMessage: `A comanda já se encontra no status '${targetStatus}'.`,
    };
  }

  // 3. Imutabilidade de estados terminais (PAGA e CANCELADA)
  if (currentComanda.status === ComandaStatus.PAGA) {
    return {
      allowed: false,
      errorCode: 'IMMUTABLE_PAID_TAB',
      errorMessage: 'Comanda já está paga e finalizada. Modificações financeiras ou reabertura são estritamente proibidas.',
    };
  }

  if (currentComanda.status === ComandaStatus.CANCELADA) {
    return {
      allowed: false,
      errorCode: 'IMMUTABLE_CANCELLED_TAB',
      errorMessage: 'Comanda cancelada não pode ser reativada.',
    };
  }

  // 4. Verificacao na matriz de transicoes permitidas
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentComanda.status] || [];
  if (!allowedNextStatuses.includes(targetStatus)) {
    return {
      allowed: false,
      errorCode: 'INVALID_STATE_TRANSITION',
      errorMessage: `Transição inválida de '${currentComanda.status}' para '${targetStatus}'.`,
    };
  }

  // 5. Regras especificas por status de destino:

  // A) Transição para PEDINDO_CONTA
  if (targetStatus === ComandaStatus.PEDINDO_CONTA) {
    if (!canUserPerform(userProfile, Permission.COMANDA_REQUEST_BILL)) {
      return {
        allowed: false,
        errorCode: 'UNAUTHORIZED_ACTION',
        errorMessage: 'Papel do usuário não tem permissão para solicitar conta.',
      };
    }

    if (itensCount <= 0 || subtotalCentavos <= 0) {
      return {
        allowed: false,
        errorCode: 'CANNOT_REQUEST_BILL_EMPTY_TAB',
        errorMessage: 'Não é possível solicitar a conta de uma comanda sem itens ou com total zerado.',
      };
    }
  }

  // B) Transição para PAGA (Fechamento)
  if (targetStatus === ComandaStatus.PAGA) {
    if (!canUserPerform(userProfile, Permission.COMANDA_CLOSE)) {
      return {
        allowed: false,
        errorCode: 'UNAUTHORIZED_ACTION',
        errorMessage: 'Apenas operadores de Caixa ou Administradores podem registrar pagamento e fechar comanda.',
      };
    }

    if (itensCount <= 0 || subtotalCentavos <= 0) {
      return {
        allowed: false,
        errorCode: 'CANNOT_CLOSE_EMPTY_TAB',
        errorMessage: 'Não é possível fechar comanda vazia como PAGA. Utilize o cancelamento se a comanda foi aberta por engano.',
      };
    }

    if (isPaid !== undefined && !isPaid) {
      return {
        allowed: false,
        errorCode: 'UNPAID_TAB',
        errorMessage: 'Comanda não pode ser marcada como PAGA sem confirmação de recebimento integral do pagamento.',
      };
    }
  }

  // C) Transição para CANCELADA
  if (targetStatus === ComandaStatus.CANCELADA) {
    if (!canUserPerform(userProfile, Permission.COMANDA_CANCEL)) {
      return {
        allowed: false,
        errorCode: 'UNAUTHORIZED_ACTION',
        errorMessage: 'Apenas Administradores possuem autorização para cancelar comandas.',
      };
    }

    if (!context.motivoCancelamento || context.motivoCancelamento.trim().length < 3) {
      return {
        allowed: false,
        errorCode: 'MISSING_CANCELLATION_REASON',
        errorMessage: 'É obrigatório informar o motivo do cancelamento da comanda para fins de auditoria.',
      };
    }
  }

  // D) Transição de retorno de PEDINDO_CONTA para ABERTA (novo item pedido na mesa)
  if (currentComanda.status === ComandaStatus.PEDINDO_CONTA && targetStatus === ComandaStatus.ABERTA) {
    if (!canUserPerform(userProfile, Permission.COMANDA_ADD_ITEM)) {
      return {
        allowed: false,
        errorCode: 'UNAUTHORIZED_ACTION',
        errorMessage: 'Sem permissão para reabrir comanda para novos pedidos.',
      };
    }
  }

  return {
    allowed: true,
  };
}

/**
 * Asserção que dispara erro com detalhes se a transição não for permitida
 */
export function assertComandaTransitionAllowed(
  currentComanda: Comanda,
  context: ComandaTransitionContext
): void {
  const result = validateComandaTransition(currentComanda, context);
  if (!result.allowed) {
    const error = new Error(result.errorMessage || 'Transição de comanda não permitida por regras de segurança.');
    (error as unknown as Record<string, unknown>).code = result.errorCode;
    throw error;
  }
}
