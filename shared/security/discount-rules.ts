import { FormaPagamento, UserProfile, UserRole, TipoNotificacao } from '../types';
import { canUserPerform } from '../auth/rbac';
import { Permission } from '../auth/types';

export const MAX_STANDARD_CASHIER_DISCOUNT_PERCENT = 10; // 10%
export const MAX_ABSOLUTE_DISCOUNT_PERCENT = 100;         // 100% (cortesia completa pelo admin)

export interface DiscountValidationInput {
  subtotalCentavos: number;
  descontoCentavos: number;
  userProfile: UserProfile;
  motivoDesconto?: string;
  adminApproved?: boolean;
}

export interface DiscountValidationResult {
  isValid: boolean;
  totalCalculadoCentavos: number;
  percentualDesconto: number;
  isDescontoAlto: boolean;
  requiresAdminApproval: boolean;
  notificationType?: TipoNotificacao;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Validação rigorosa de segurança de descontos
 */
export function validateDiscountSecurity(input: DiscountValidationInput): DiscountValidationResult {
  const { subtotalCentavos, descontoCentavos, userProfile, motivoDesconto, adminApproved } = input;

  // 1. Verificacao de usuario ativo
  if (!userProfile || !userProfile.ativo) {
    return {
      isValid: false,
      totalCalculadoCentavos: subtotalCentavos,
      percentualDesconto: 0,
      isDescontoAlto: false,
      requiresAdminApproval: false,
      errorCode: 'INACTIVE_USER',
      errorMessage: 'Usuário inativo ou não autenticado para aplicar descontos.',
    };
  }

  // 2. Desconto negativo ou NaN
  if (isNaN(descontoCentavos) || descontoCentavos < 0) {
    return {
      isValid: false,
      totalCalculadoCentavos: subtotalCentavos,
      percentualDesconto: 0,
      isDescontoAlto: false,
      requiresAdminApproval: false,
      errorCode: 'INVALID_DISCOUNT_VALUE',
      errorMessage: 'O valor do desconto não pode ser negativo.',
    };
  }

  // 3. Desconto zerado (nenhum desconto aplicado)
  if (descontoCentavos === 0) {
    return {
      isValid: true,
      totalCalculadoCentavos: Math.max(0, subtotalCentavos),
      percentualDesconto: 0,
      isDescontoAlto: false,
      requiresAdminApproval: false,
    };
  }

  // 4. Subtotal zerado ou negativo nao aceita desconto
  if (subtotalCentavos <= 0) {
    return {
      isValid: false,
      totalCalculadoCentavos: 0,
      percentualDesconto: 0,
      isDescontoAlto: false,
      requiresAdminApproval: false,
      errorCode: 'ZERO_SUBTOTAL_DISCOUNT',
      errorMessage: 'Não é possível aplicar desconto em comanda com subtotal zero.',
    };
  }

  // 5. Desconto superior ao subtotal
  if (descontoCentavos > subtotalCentavos) {
    return {
      isValid: false,
      totalCalculadoCentavos: subtotalCentavos,
      percentualDesconto: 0,
      isDescontoAlto: true,
      requiresAdminApproval: true,
      errorCode: 'DISCOUNT_EXCEEDS_SUBTOTAL',
      errorMessage: `Desconto (R$ ${(descontoCentavos / 100).toFixed(2)}) não pode ser superior ao subtotal (R$ ${(subtotalCentavos / 100).toFixed(2)}).`,
    };
  }

  // 6. Atendente nao tem permissao para aplicar desconto
  const canApplyStandard = canUserPerform(userProfile, Permission.COMANDA_APPLY_DISCOUNT_STANDARD);
  if (!canApplyStandard) {
    return {
      isValid: false,
      totalCalculadoCentavos: subtotalCentavos,
      percentualDesconto: 0,
      isDescontoAlto: false,
      requiresAdminApproval: false,
      errorCode: 'ROLE_DISCOUNT_FORBIDDEN',
      errorMessage: 'Atendentes não têm permissão para aplicar descontos. Apenas Caixa ou Admin.',
    };
  }

  // Calcula percentual
  const percentual = (descontoCentavos / subtotalCentavos) * 100;
  const isDescontoAlto = percentual > MAX_STANDARD_CASHIER_DISCOUNT_PERCENT;
  const isAdmin = userProfile.role === UserRole.ADMIN;

  // 7. Desconto alto (> 10%)
  if (isDescontoAlto) {
    if (!isAdmin && !adminApproved) {
      return {
        isValid: false,
        totalCalculadoCentavos: subtotalCentavos - descontoCentavos,
        percentualDesconto: Math.round(percentual * 100) / 100,
        isDescontoAlto: true,
        requiresAdminApproval: true,
        notificationType: TipoNotificacao.DESCONTO_ALTO,
        errorCode: 'HIGH_DISCOUNT_REQUIRES_APPROVAL',
        errorMessage: `Desconto de ${percentual.toFixed(1)}% ultrapassa o limite padrão de ${MAX_STANDARD_CASHIER_DISCOUNT_PERCENT}% e requer autorização do Administrador.`,
      };
    }
  }

  // Desconto valido
  const totalCalculadoCentavos = Math.max(0, subtotalCentavos - descontoCentavos);

  return {
    isValid: true,
    totalCalculadoCentavos,
    percentualDesconto: Math.round(percentual * 100) / 100,
    isDescontoAlto,
    requiresAdminApproval: isDescontoAlto && !isAdmin,
    notificationType: isDescontoAlto ? TipoNotificacao.DESCONTO_ALTO : undefined,
  };
}

export interface PaymentValidationInput {
  totalCentavos: number;
  valorPagoCentavos: number;
  formaPagamento: FormaPagamento;
}

export interface PaymentValidationResult {
  isValid: boolean;
  trocoCentavos: number;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Validação de integridade e regras financeiras do pagamento
 */
export function validatePaymentSecurity(input: PaymentValidationInput): PaymentValidationResult {
  const { totalCentavos, valorPagoCentavos, formaPagamento } = input;

  if (isNaN(totalCentavos) || totalCentavos < 0) {
    return {
      isValid: false,
      trocoCentavos: 0,
      errorCode: 'INVALID_TOTAL',
      errorMessage: 'Total da comanda inválido.',
    };
  }

  if (isNaN(valorPagoCentavos) || valorPagoCentavos < 0) {
    return {
      isValid: false,
      trocoCentavos: 0,
      errorCode: 'INVALID_AMOUNT_PAID',
      errorMessage: 'Valor pago não pode ser negativo.',
    };
  }

  if (totalCentavos === 0) {
    return {
      isValid: true,
      trocoCentavos: 0,
    };
  }

  // Verifica se o valor entregue cobre o total
  if (valorPagoCentavos < totalCentavos) {
    return {
      isValid: false,
      trocoCentavos: 0,
      errorCode: 'INSUFFICIENT_PAYMENT',
      errorMessage: `Valor pago (R$ ${(valorPagoCentavos / 100).toFixed(2)}) é inferior ao total devido (R$ ${(totalCentavos / 100).toFixed(2)}).`,
    };
  }

  // Para pagamentos eletronicos (PIX, Cartoes, Vale), nao deve haver troco
  if (formaPagamento !== FormaPagamento.DINHEIRO) {
    if (valorPagoCentavos !== totalCentavos) {
      return {
        isValid: false,
        trocoCentavos: 0,
        errorCode: 'EXACT_PAYMENT_REQUIRED_FOR_DIGITAL',
        errorMessage: `Para pagamento via ${formaPagamento}, o valor deve ser exatamente igual ao total (R$ ${(totalCentavos / 100).toFixed(2)}).`,
      };
    }

    return {
      isValid: true,
      trocoCentavos: 0,
    };
  }

  // Para dinheiro, calcula troco
  const trocoCentavos = Math.max(0, valorPagoCentavos - totalCentavos);

  return {
    isValid: true,
    trocoCentavos,
  };
}
