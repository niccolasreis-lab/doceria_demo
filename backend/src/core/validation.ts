import { z } from 'zod';
import { ValidationError } from './errors.js';

export const AdicionarItemInputSchema = z.object({
  comanda_id: z.string().min(1, 'ID da comanda é obrigatório.'),
  produto_id: z.string().min(1, 'ID do produto é obrigatório.'),
  quantidade: z.number().int().min(1, 'Quantidade deve ser um número inteiro >= 1.').max(100, 'Quantidade máxima permitida por item é 100.'),
  observacao: z.string().max(255, 'Observação não pode exceder 255 caracteres.').optional(),
});

export type AdicionarItemInput = z.infer<typeof AdicionarItemInputSchema>;

export const SolicitarContaInputSchema = z.object({
  comanda_id: z.string().min(1, 'ID da comanda é obrigatório.'),
  tipo_desconto: z.enum(['PERCENTUAL', 'VALOR_FIXO']).optional(),
  valor_desconto: z.number().min(0, 'Valor de desconto não pode ser negativo.').optional(),
  motivo_desconto: z.string().max(255).optional(),
  cupom: z.string().max(50).optional(),
});

export type SolicitarContaInput = z.infer<typeof SolicitarContaInputSchema>;

export const FecharComandaInputSchema = z.object({
  comanda_id: z.string().min(1, 'ID da comanda é obrigatório.'),
  metodo_pagamento: z.enum(['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO'], {
    errorMap: () => ({ message: 'Método de pagamento inválido. Use: DINHEIRO, PIX, CARTAO_CREDITO ou CARTAO_DEBITO.' }),
  }),
  valor_pago_centavos: z.number().int().min(0, 'Valor pago deve ser um número inteiro >= 0 em centavos.').optional(),
  garcom_fechamento_id: z.string().optional(),
});

export type FecharComandaInput = z.infer<typeof FecharComandaInputSchema>;

export const FechamentoCaixaCronInputSchema = z.object({
  data_referencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido. Use YYYY-MM-DD.').optional(),
  processar_abandonadas: z.boolean().optional().default(true),
  tempo_limite_horas: z.number().min(1).max(72).optional().default(12),
});

export type FechamentoCaixaCronInput = z.infer<typeof FechamentoCaixaCronInputSchema>;

/**
 * Safely parses input using a zod schema and throws Domain ValidationError on failure
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | ');
    throw new ValidationError(`Dados de entrada inválidos: ${issues}`, {
      issues: result.error.issues,
    });
  }
  return result.data;
}
