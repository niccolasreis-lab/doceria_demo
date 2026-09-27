import { describe, it, expect, beforeEach } from 'vitest';
import { handleAdicionarItem } from '../functions/adicionar-item/src/main.js';
import { handleSolicitarConta } from '../functions/solicitar-conta/src/main.js';
import { handleFecharComanda } from '../functions/fechar-comanda/src/main.js';
import { handleFechamentoCaixaCron } from '../functions/fechamento-caixa-cron/src/main.js';
import {
  MesaStatus,
  ComandaStatus,
  FormaPagamento,
  TipoNotificacao,
  UserRole,
} from '../../shared/types.js';
import {
  EmptyComandaClosingError,
  EmptyComandaBillRequestError,
  ProductUnavailableError,
  DomainError,
} from '../src/core/errors.js';

class MockDatabases {
  public store: Record<string, Record<string, any>> = {
    mesas: {},
    produtos: {},
    comandas: {},
    itens_comanda: {},
    pagamentos: {},
    fechamentos_caixa: {},
    notificacoes: {},
    profiles: {},
  };

  async getDocument(databaseId: string, collectionId: string, documentId: string) {
    const col = this.store[collectionId];
    if (!col || !col[documentId]) {
      throw { code: 404, message: `Document '${documentId}' not found in '${collectionId}'` };
    }
    return { ...col[documentId] };
  }

  async listDocuments(databaseId: string, collectionId: string, queries: any[] = []) {
    const col = this.store[collectionId] || {};
    let docs = Object.values(col);

    for (const q of queries) {
      if (typeof q === 'string') {
        const equalMatch = q.match(/equal\("([^"]+)",\s*(\[[^\]]+\]|"[^"]*"|[^)]+)\)/);
        if (equalMatch) {
          const field = equalMatch[1];
          let val = equalMatch[2];
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
          } else if (val.startsWith('[') && val.endsWith(']')) {
            try {
              val = JSON.parse(val)[0];
            } catch {}
          }
          docs = docs.filter(d => String(d[field]) === String(val));
        }

        const startsWithMatch = q.match(/startsWith\("([^"]+)",\s*(\[[^\]]+\]|"[^"]*"|[^)]+)\)/);
        if (startsWithMatch) {
          const field = startsWithMatch[1];
          let val = startsWithMatch[2];
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
          } else if (val.startsWith('[') && val.endsWith(']')) {
            try {
              val = JSON.parse(val)[0];
            } catch {}
          }
          docs = docs.filter(d => String(d[field] || '').startsWith(String(val)));
        }
      }
    }

    return {
      total: docs.length,
      documents: docs.map(d => ({ ...d })),
    };
  }

  async createDocument(databaseId: string, collectionId: string, documentId: string, data: any) {
    if (!this.store[collectionId]) {
      this.store[collectionId] = {};
    }
    const doc = { $id: documentId, ...data };
    this.store[collectionId][documentId] = doc;
    return { ...doc };
  }

  async updateDocument(databaseId: string, collectionId: string, documentId: string, data: any) {
    const col = this.store[collectionId];
    if (!col || !col[documentId]) {
      throw { code: 404, message: `Document '${documentId}' not found for update in '${collectionId}'` };
    }
    const updated = { ...col[documentId], ...data, $id: documentId };
    col[documentId] = updated;
    return { ...updated };
  }
}

describe('Appwrite Functions - Testes de Contratos e Integração', () => {
  let mockDb: MockDatabases;

  beforeEach(() => {
    mockDb = new MockDatabases();

    // 1. Mesa 1
    mockDb.store.mesas['mesa_01'] = {
      $id: 'mesa_01',
      numero: 1,
      capacidade: 4,
      status: MesaStatus.LIVRE,
      comanda_ativa_id: null,
    };

    // 2. Produtos
    mockDb.store.produtos['prod_bolo_01'] = {
      $id: 'prod_bolo_01',
      nome: 'Fatia de Bolo de Cenoura com Brigadeiro Belga',
      categoria: 'Bolos',
      preco_centavos: 1850,
      disponivel: true,
    };

    mockDb.store.produtos['prod_indisponivel'] = {
      $id: 'prod_indisponivel',
      nome: 'Torta Esgotada',
      categoria: 'Bolos',
      preco_centavos: 2500,
      disponivel: false,
    };

    // 3. Comanda 01
    mockDb.store.comandas['comanda_01'] = {
      $id: 'comanda_01',
      codigo: 'CMD-101',
      mesa_id: 'mesa_01',
      mesa_numero: 1,
      atendente_id: 'user_garcom_01',
      atendente_nome: 'Lucas Oliveira',
      status: ComandaStatus.ABERTA,
      subtotal_centavos: 0,
      desconto_centavos: 0,
      total_centavos: 0,
      aberta_em: new Date().toISOString(),
    };
  });

  describe('Function 1: adicionar-item-comanda', () => {
    it('deve adicionar item, buscar preço no banco, recalcular subtotal e marcar mesa como ocupada', async () => {
      const result = await handleAdicionarItem(mockDb as any, {
        comandaId: 'comanda_01',
        produtoId: 'prod_bolo_01',
        quantidade: 2,
        observacao: 'Fatia caprichada',
        usuarioId: 'user_garcom_01',
        usuarioNome: 'Lucas Oliveira',
      });

      expect(result.sucesso).toBe(true);
      expect(result.item.preco_unitario_centavos).toBe(1850);
      expect(result.item.subtotal_centavos).toBe(3700);
      expect(result.novoTotalCentavos).toBe(3700);

      // Comanda atualizada
      expect(mockDb.store.comandas['comanda_01'].subtotal_centavos).toBe(3700);
      expect(mockDb.store.comandas['comanda_01'].total_centavos).toBe(3700);

      // Mesa atualizada para 'ocupada'
      expect(mockDb.store.mesas['mesa_01'].status).toBe(MesaStatus.OCUPADA);
    });

    it('deve rejeitar adição de produto indisponível', async () => {
      await expect(
        handleAdicionarItem(mockDb as any, {
          comandaId: 'comanda_01',
          produtoId: 'prod_indisponivel',
          quantidade: 1,
        })
      ).rejects.toThrow(ProductUnavailableError);
    });

    it('deve rejeitar adição de item em comanda não aberta', async () => {
      mockDb.store.comandas['comanda_01'].status = ComandaStatus.PAGA;

      await expect(
        handleAdicionarItem(mockDb as any, {
          comandaId: 'comanda_01',
          produtoId: 'prod_bolo_01',
          quantidade: 1,
        })
      ).rejects.toThrow(DomainError);
    });
  });

  describe('Function 2: solicitar-conta', () => {
    it('deve rejeitar solicitar conta de comanda sem itens', async () => {
      await expect(
        handleSolicitarConta(mockDb as any, {
          comandaId: 'comanda_01',
        })
      ).rejects.toThrow(EmptyComandaBillRequestError);
    });

    it('deve alterar status para pedindo_conta e emitir notificação para o Caixa', async () => {
      // 1. Adicionar item
      await handleAdicionarItem(mockDb as any, {
        comandaId: 'comanda_01',
        produtoId: 'prod_bolo_01',
        quantidade: 1,
      });

      // 2. Solicitar conta
      const result = await handleSolicitarConta(mockDb as any, {
        comandaId: 'comanda_01',
      });

      expect(result.sucesso).toBe(true);
      expect(result.status).toBe('pedindo_conta');

      expect(mockDb.store.comandas['comanda_01'].status).toBe(ComandaStatus.PEDINDO_CONTA);
      expect(mockDb.store.mesas['mesa_01'].status).toBe(MesaStatus.PEDINDO_CONTA);

      // Notificação gerada
      const notifs = Object.values(mockDb.store.notificacoes);
      expect(notifs.length).toBe(1);
      expect(notifs[0].tipo).toBe(TipoNotificacao.PEDIR_CONTA);
      expect(notifs[0].destinatario_role).toBe(UserRole.CAIXA);
    });
  });

  describe('Function 3: fechar-comanda', () => {
    it('deve rejeitar fechamento de comanda sem itens', async () => {
      await expect(
        handleFecharComanda(mockDb as any, {
          comandaId: 'comanda_01',
          formaPagamento: FormaPagamento.DINHEIRO,
          valorEntregueCentavos: 5000,
        })
      ).rejects.toThrow(EmptyComandaClosingError);
    });

    it('deve fechar comanda com dinheiro, calcular troco, liberar mesa e gerar cupom de impressão', async () => {
      // Adicionar item (2 fatias de bolo = 3700)
      await handleAdicionarItem(mockDb as any, {
        comandaId: 'comanda_01',
        produtoId: 'prod_bolo_01',
        quantidade: 2,
      });

      // Fechar comanda entregando R$ 50,00 (5000 centavos)
      const result = await handleFecharComanda(mockDb as any, {
        comandaId: 'comanda_01',
        formaPagamento: FormaPagamento.DINHEIRO,
        descontoCentavos: 200, // R$ 2,00 de desconto
        valorEntregueCentavos: 5000,
        caixaId: 'user_caixa_01',
        caixaNome: 'Mariana Silva',
      });

      expect(result.sucesso).toBe(true);
      expect(mockDb.store.comandas['comanda_01'].status).toBe(ComandaStatus.PAGA);
      expect(mockDb.store.comandas['comanda_01'].subtotal_centavos).toBe(3700);
      expect(mockDb.store.comandas['comanda_01'].desconto_centavos).toBe(200);
      expect(mockDb.store.comandas['comanda_01'].total_centavos).toBe(3500);

      // Mesa liberada
      expect(mockDb.store.mesas['mesa_01'].status).toBe(MesaStatus.LIVRE);
      expect(mockDb.store.mesas['mesa_01'].comanda_ativa_id).toBeNull();

      // Cupom Payload gerado
      expect(result.cupomPayload.totalCentavos).toBe(3500);
      expect(result.cupomPayload.valorPagoCentavos).toBe(5000);
      expect(result.cupomPayload.trocoCentavos).toBe(1500); // R$ 15,00 troco
      expect(result.cupomPayload.itens.length).toBe(1);
    });

    it('deve disparar alerta de desconto alto para o admin quando desconto > 10%', async () => {
      await handleAdicionarItem(mockDb as any, {
        comandaId: 'comanda_01',
        produtoId: 'prod_bolo_01',
        quantidade: 2, // 3700
      });

      // Desconto de R$ 10,00 (1000 centavos) em 3700 (> 27%)
      await handleFecharComanda(mockDb as any, {
        comandaId: 'comanda_01',
        formaPagamento: FormaPagamento.PIX,
        descontoCentavos: 1000,
        caixaId: 'user_caixa_01',
        caixaNome: 'Mariana Silva',
      });

      const notifs = Object.values(mockDb.store.notificacoes);
      const alertaDesc = notifs.find(n => n.tipo === TipoNotificacao.DESCONTO_ALTO);
      expect(alertaDesc).toBeDefined();
      expect(alertaDesc?.destinatario_role).toBe(UserRole.ADMIN);
    });
  });

  describe('Function 4: fechamento-caixa-cron', () => {
    it('deve consolidar o faturamento diário, criar documento e notificar o admin', async () => {
      const hoje = new Date().toISOString().split('T')[0];

      // Reset comandas
      mockDb.store.comandas = {};
      mockDb.store.pagamentos = {};

      mockDb.store.comandas['c1'] = {
        $id: 'c1',
        status: ComandaStatus.PAGA,
        fechada_em: `${hoje}T14:00:00.000Z`,
        subtotal_centavos: 5000,
        desconto_centavos: 500,
        total_centavos: 4500,
      };

      mockDb.store.pagamentos['p1'] = {
        $id: 'p1',
        comanda_id: 'c1',
        forma_pagamento: FormaPagamento.PIX,
        valor_pago_centavos: 4500,
        troco_centavos: 0,
        criado_em: `${hoje}T14:00:00.000Z`,
      };

      const result = await handleFechamentoCaixaCron(mockDb as any, {
        dataReferencia: hoje,
      });

      expect(result.sucesso).toBe(true);
      expect(result.totalVendasCentavos).toBe(4500);

      const fechamentoDoc = mockDb.store.fechamentos_caixa[result.fechamentoId];
      expect(fechamentoDoc).toBeDefined();
      expect(fechamentoDoc.total_vendas_centavos).toBe(4500);
      expect(fechamentoDoc.total_pix_centavos).toBe(4500);
      expect(fechamentoDoc.quantidade_comandas).toBe(1);

      // Notificação gerada
      const notifs = Object.values(mockDb.store.notificacoes);
      const notifCron = notifs.find(n => n.tipo === TipoNotificacao.FECHAMENTO_CAIXA);
      expect(notifCron).toBeDefined();
      expect(notifCron?.destinatario_role).toBe(UserRole.ADMIN);
    });
  });
});
