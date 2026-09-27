import { UserRole } from '../../../../shared/types';
import {
  NotificacaoPayload,
  NotificationFilter,
  NotificationSubscription,
} from '../../../../shared/integrations/notifications/NotificationPort';
import { NotificacaoService } from '../../../../shared/integrations/notifications/NotificacaoService';

export interface WebNotificacaoOptions {
  habilitarSom?: boolean;
  habilitarNotificacoesNavegador?: boolean;
  frequenciaSomHz?: number;
}

export class WebNotificacaoService {
  private baseService: NotificacaoService;
  private options: WebNotificacaoOptions;
  private audioCtx: AudioContext | null = null;

  constructor(options: WebNotificacaoOptions = {}, baseService?: NotificacaoService) {
    this.options = {
      habilitarSom: true,
      habilitarNotificacoesNavegador: true,
      frequenciaSomHz: 587.33, // Nota D5 (som agradável de sino)
      ...options,
    };
    this.baseService = baseService || new NotificacaoService();
  }

  public getBaseService(): NotificacaoService {
    return this.baseService;
  }

  /**
   * Solicita permissão para notificações nativas do navegador.
   */
  public async solicitarPermissaoNavegador(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permissao = await Notification.requestPermission();
      return permissao === 'granted';
    }
    return false;
  }

  /**
   * Toca um alerta sonoro suave utilizando sintetizador Web Audio API nativo.
   */
  public tocarSomAlerta(): void {
    if (!this.options.habilitarSom || typeof window === 'undefined') return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.options.frequenciaSomHz || 587.33, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.15); // Sobe para A5

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn('[WebNotificacaoService] Não foi possível reproduzir som de alerta:', e);
    }
  }

  /**
   * Dispara notificação no navegador se permitido.
   */
  public exibirNotificacaoNavegador(notificacao: NotificacaoPayload): void {
    if (!this.options.habilitarNotificacoesNavegador || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification(notificacao.titulo, {
          body: notificacao.mensagem,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('[WebNotificacaoService] Falha ao instanciar notificação nativa:', e);
      }
    }
  }

  /**
   * Conecta um listener para monitorar o caixa ou admin, tocando som e exibindo push no navegador.
   */
  public monitorarParaRole(
    role: UserRole,
    onNovaNotificacao: (notif: NotificacaoPayload) => void
  ): NotificationSubscription {
    return this.baseService.inscreverPorRole(role, (notif) => {
      this.tocarSomAlerta();
      this.exibirNotificacaoNavegador(notif);
      onNovaNotificacao(notif);
    });
  }

  public async emitir(notificacao: NotificacaoPayload): Promise<void> {
    await this.baseService.emitir(notificacao);
  }

  public inscrever(
    listener: (n: NotificacaoPayload) => void,
    filter?: NotificationFilter
  ): NotificationSubscription {
    return this.baseService.inscrever(listener, filter);
  }
}
