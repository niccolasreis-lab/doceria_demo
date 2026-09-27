import { UserRole, TipoNotificacao, Notificacao } from '../../types';

export interface NotificacaoPayload {
  id: string;
  tipo: TipoNotificacao | string;
  titulo: string;
  mensagem: string;
  destinatarioRole: UserRole | string;
  comandaId?: string;
  mesaNumero?: number;
  dadosExtras?: Record<string, unknown>;
  lida: boolean;
  timestamp: string;
}

export type NotificationChannel = 'in-app' | 'push' | 'realtime' | 'sound';

export interface NotificationFilter {
  role?: UserRole | string;
  tipo?: TipoNotificacao | string;
  comandaId?: string;
}

export type NotificationListener = (notificacao: NotificacaoPayload) => void | Promise<void>;

export interface NotificationSubscription {
  unsubscribe: () => void;
}

export interface NotificationPort {
  emitir(notificacao: NotificacaoPayload): Promise<void>;
  inscrever(listener: NotificationListener, filter?: NotificationFilter): NotificationSubscription;
}
