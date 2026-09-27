import { UserRole } from '../../../../shared/types';
import {
  NotificacaoPayload,
  NotificationFilter,
  NotificationSubscription,
} from '../../../../shared/integrations/notifications/NotificationPort';
import { NotificacaoService } from '../../../../shared/integrations/notifications/NotificacaoService';

export interface MobileVibrationModule {
  vibrate: (pattern?: number | number[]) => void;
}

export interface MobileNotificacaoOptions {
  habilitarVibracao?: boolean;
  vibrationModule?: MobileVibrationModule;
}

export class MobileNotificacaoService {
  private baseService: NotificacaoService;
  private options: MobileNotificacaoOptions;

  constructor(options: MobileNotificacaoOptions = {}, baseService?: NotificacaoService) {
    this.options = {
      habilitarVibracao: true,
      ...options,
    };
    this.baseService = baseService || new NotificacaoService();
  }

  public getBaseService(): NotificacaoService {
    return this.baseService;
  }

  /**
   * Dispara vibração tátil no aparelho do atendente/caixa móvel.
   */
  public vibrarAlerta(): void {
    if (!this.options.habilitarVibracao) return;

    const vibModule = this.options.vibrationModule || (global as any).Vibration;
    if (vibModule && typeof vibModule.vibrate === 'function') {
      try {
        // Padrão curto de 2 toques: vibra 200ms, pausa 100ms, vibra 200ms
        vibModule.vibrate([200, 100, 200]);
      } catch (e) {
        console.warn('[MobileNotificacaoService] Falha ao acionar vibração nativa:', e);
      }
    }
  }

  /**
   * Monitora notificações para um papel específico no app mobile (ex: ATENDENTE ou CAIXA),
   * acionando vibração e chamando o callback da interface.
   */
  public monitorarParaRole(
    role: UserRole,
    onNovaNotificacao: (notif: NotificacaoPayload) => void
  ): NotificationSubscription {
    return this.baseService.inscreverPorRole(role, (notif) => {
      this.vibrarAlerta();
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
