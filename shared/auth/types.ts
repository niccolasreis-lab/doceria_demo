import { UserRole, UserProfile } from '../types';

export enum Permission {
  // Comandas
  COMANDA_VIEW = 'comanda:view',
  COMANDA_CREATE = 'comanda:create',
  COMANDA_ADD_ITEM = 'comanda:add_item',
  COMANDA_REQUEST_BILL = 'comanda:request_bill',
  COMANDA_APPLY_DISCOUNT_STANDARD = 'comanda:apply_discount_standard', // Up to 10%
  COMANDA_APPLY_DISCOUNT_HIGH = 'comanda:apply_discount_high',         // Over 10%
  COMANDA_CLOSE = 'comanda:close',
  COMANDA_CANCEL = 'comanda:cancel',

  // Produtos
  PRODUTOS_VIEW = 'produtos:view',
  PRODUTOS_MANAGE = 'produtos:manage',

  // Mesas
  MESAS_VIEW = 'mesas:view',
  MESAS_MANAGE = 'mesas:manage',

  // Gestao e Relatorios
  USUARIOS_MANAGE = 'usuarios:manage',
  RELATORIOS_VIEW = 'relatorios:view',
  DASHBOARD_ADMIN_VIEW = 'dashboard_admin:view',
  FECHAMENTO_CAIXA_VIEW = 'fechamento_caixa:view',
  FECHAMENTO_CAIXA_EXECUTE = 'fechamento_caixa:execute',

  // Notificacoes
  NOTIFICACOES_CAIXA = 'notificacoes:caixa',
  NOTIFICACOES_ADMIN = 'notificacoes:admin'
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  profile: UserProfile;
  token?: string;
  expireAt?: string;
}

export interface AuthResult {
  success: boolean;
  session?: AuthSession;
  profile?: UserProfile;
  error?: string;
  errorCode?: string;
}

export type RouteAccessReason =
  | 'ALLOWED'
  | 'UNAUTHENTICATED'
  | 'INACTIVE_USER'
  | 'INSUFFICIENT_ROLE';

export interface RouteAccessDecision {
  isAllowed: boolean;
  reason: RouteAccessReason;
  redirectTo: string;
}

export interface RouteRule {
  prefix: string;
  exact?: boolean;
  allowedRoles: UserRole[];
  requiresAuth: boolean;
}
