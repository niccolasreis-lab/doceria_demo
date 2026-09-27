import { UserRole, TipoNotificacao } from '../../types';
import {
  NotificacaoPayload,
  NotificationFilter,
  NotificationListener,
  NotificationSubscription,
  NotificationPort,
} from './NotificationPort';

export interface NotificacaoServiceOptions {
  ttlDeduplicacaoMs?: number;
  maxHistorico?: number;
  canalRealtimeHabilitado?: boolean;
}

interface ListenerEntry {
  id: string;
  listener: NotificationListener;
  filter?: NotificationFilter;
}

export class NotificacaoService implements NotificationPort {
  private listeners: Map<string, ListenerEntry> = new Map();
  private historico: NotificacaoPayload[] = [];
  private cacheDeduplicacao: Map<string, number> = new Map();
  private options: Required<NotificacaoServiceOptions>;

  constructor(options: NotificacaoServiceOptions = {}) {
    this.options = {
      ttlDeduplicacaoMs: options.ttlDeduplicacaoMs ?? 10000, // 10 segundos para deduplicar eventos repetidos
      maxHistorico: options.maxHistorico ?? 200,
      canalRealtimeHabilitado: options.canalRealtimeHabilitado ?? true,
    };
  }

  /**
   * Emite uma notificação normalizada, verificando deduplicação e despachando para os listeners.
   */
  public async emitir(notificacao: NotificacaoPayload): Promise<void> {
    const agora = Date.now();
    this.limparCacheDeduplicacao(agora);

    // Chave de deduplicação composta
    const deduplicationKey = notificacao.id || `${notificacao.tipo}_${notificacao.comandaId || ''}_${notificacao.destinatarioRole}`;

    const ultimoTimestamp = this.cacheDeduplicacao.get(deduplicationKey);
    if (ultimoTimestamp && agora - ultimoTimestamp < this.options.ttlDeduplicacaoMs) {
      // Evento duplicado descartado silenciosamente para evitar spam de alertas
      return;
    }

    this.cacheDeduplicacao.set(deduplicationKey, agora);

    // Garante que campos obrigatórios existam
    const payloadCompleto: NotificacaoPayload = {
      ...notificacao,
      id: notificacao.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: notificacao.timestamp || new Date().toISOString(),
      lida: notificacao.lida ?? false,
    };

    // Armazena no histórico em memória
    this.historico.unshift(payloadCompleto);
    if (this.historico.length > this.options.maxHistorico) {
      this.historico.pop();
    }

    // Despacha para todos os listeners compatíveis
    this.listeners.forEach((entry) => {
      if (this.correspondeAoFiltro(payloadCompleto, entry.filter)) {
        try {
          entry.listener(payloadCompleto);
        } catch (erro) {
          console.error(`[NotificacaoService] Erro no listener ${entry.id}:`, erro);
        }
      }
    });
  }

  /**
   * Inscreve um listener com filtros opcionais (por Role, Tipo ou Comanda).
   */
  public inscrever(
    listener: NotificationListener,
    filter?: NotificationFilter
  ): NotificationSubscription {
    const listenerId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    this.listeners.set(listenerId, { id: listenerId, listener, filter });

    return {
      unsubscribe: () => {
        this.listeners.delete(listenerId);
      },
    };
  }

  /**
   * Atalho para inscrever um listener apenas para uma Role específica (ex: CAIXA ou ADMIN).
   */
  public inscreverPorRole(role: UserRole, listener: NotificationListener): NotificationSubscription {
    return this.inscrever(listener, { role });
  }

  /**
   * Helper: Dispara notificação de 'Pedir Conta' (destinada ao Caixa).
   */
  public async notificarPedirConta(params: {
    comandaId: string;
    mesaNumero: number;
    atendenteNome?: string;
  }): Promise<NotificacaoPayload> {
    const payload: NotificacaoPayload = {
      id: `pedir_conta_${params.comandaId}_${Date.now()}`,
      tipo: TipoNotificacao.PEDIR_CONTA,
      titulo: `Mesa ${params.mesaNumero} solicitou a conta`,
      mensagem: `A comanda da Mesa ${params.mesaNumero} está pronta para fechamento.${
        params.atendenteNome ? ` Atendente: ${params.atendenteNome}.` : ''
      }`,
      destinatarioRole: UserRole.CAIXA,
      comandaId: params.comandaId,
      mesaNumero: params.mesaNumero,
      lida: false,
      timestamp: new Date().toISOString(),
    };

    await this.emitir(payload);
    return payload;
  }

  /**
   * Helper: Dispara notificação de 'Desconto Alto' (destinada ao Admin).
   */
  public async notificarDescontoAlto(params: {
    comandaId: string;
    mesaNumero: number;
    percentualDesconto: number;
    valorDescontoCentavos: number;
    operadorNome: string;
  }): Promise<NotificacaoPayload> {
    const valorReais = (params.valorDescontoCentavos / 100).toFixed(2).replace('.', ',');
    const payload: NotificacaoPayload = {
      id: `desc_alto_${params.comandaId}_${Date.now()}`,
      tipo: TipoNotificacao.DESCONTO_ALTO,
      titulo: `Alerta: Desconto de ${params.percentualDesconto}% aplicado`,
      mensagem: `Operador ${params.operadorNome} aplicou desconto de R$ ${valorReais} na Mesa ${params.mesaNumero}.`,
      destinatarioRole: UserRole.ADMIN,
      comandaId: params.comandaId,
      mesaNumero: params.mesaNumero,
      dadosExtras: {
        percentual: params.percentualDesconto,
        descontoCentavos: params.valorDescontoCentavos,
        operador: params.operadorNome,
      },
      lida: false,
      timestamp: new Date().toISOString(),
    };

    await this.emitir(payload);
    return payload;
  }

  /**
   * Helper: Dispara notificação de 'Fechamento de Caixa' (destinada ao Admin).
   */
  public async notificarFechamentoCaixa(params: {
    fechamentoId: string;
    dataReferencia: string;
    totalVendasCentavos: number;
    fechadoPor: string;
  }): Promise<NotificacaoPayload> {
    const totalReais = (params.totalVendasCentavos / 100).toFixed(2).replace('.', ',');
    const payload: NotificacaoPayload = {
      id: `fechamento_${params.fechamentoId}`,
      tipo: TipoNotificacao.FECHAMENTO_CAIXA,
      titulo: `Fechamento de Caixa Consolidado (${params.dataReferencia})`,
      mensagem: `Total consolidado de R$ ${totalReais}. Fechado por: ${params.fechadoPor}.`,
      destinatarioRole: UserRole.ADMIN,
      dadosExtras: {
        fechamentoId: params.fechamentoId,
        dataReferencia: params.dataReferencia,
        totalVendasCentavos: params.totalVendasCentavos,
      },
      lida: false,
      timestamp: new Date().toISOString(),
    };

    await this.emitir(payload);
    return payload;
  }

  /**
   * Marca uma notificação como lida no histórico em memória.
   */
  public marcarComoLida(notificacaoId: string): boolean {
    const item = this.historico.find((n) => n.id === notificacaoId);
    if (item) {
      item.lida = true;
      return true;
    }
    return false;
  }

  /**
   * Retorna notificações filtradas por role ou status de leitura.
   */
  public getNotificacoes(filtro?: { role?: UserRole | string; apenasNaoLidas?: boolean }): NotificacaoPayload[] {
    return this.historico.filter((item) => {
      if (filtro?.role && item.destinatarioRole !== filtro.role) return false;
      if (filtro?.apenasNaoLidas && item.lida) return false;
      return true;
    });
  }

  public limparHistorico(): void {
    this.historico = [];
  }

  private correspondeAoFiltro(notif: NotificacaoPayload, filter?: NotificationFilter): boolean {
    if (!filter) return true;
    if (filter.role && notif.destinatarioRole !== filter.role) return false;
    if (filter.tipo && notif.tipo !== filter.tipo) return false;
    if (filter.comandaId && notif.comandaId !== filter.comandaId) return false;
    return true;
  }

  private limparCacheDeduplicacao(agora: number): void {
    this.cacheDeduplicacao.forEach((timestamp, key) => {
      if (agora - timestamp > this.options.ttlDeduplicacaoMs) {
        this.cacheDeduplicacao.delete(key);
      }
    });
  }
}
