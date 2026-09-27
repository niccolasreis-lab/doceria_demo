import { UserProfile, UserRole } from '../types';
import { AuthCredentials, AuthSession, Permission, RouteAccessDecision } from './types';
import { AuthServicePort, MockAuthService } from './auth-service';
import { canUserPerform, hasPermission } from './rbac';
import { evaluateRouteAccess } from './route-guards';

export interface AuthState {
  session: AuthSession | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type AuthStateListener = (state: AuthState) => void;

/**
 * Gerenciador de estado de autenticacao e sessao universal (Web, Mobile, Node)
 */
export class AuthStateManager {
  private state: AuthState = {
    session: null,
    profile: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  };

  private listeners: Set<AuthStateListener> = new Set();

  constructor(private readonly authService: AuthServicePort = new MockAuthService()) {}

  public getState(): AuthState {
    return { ...this.state };
  }

  public subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(partialState: Partial<AuthState>): void {
    this.state = {
      ...this.state,
      ...partialState,
      isAuthenticated: partialState.session ? true : partialState.session === null ? false : this.state.isAuthenticated,
      profile: partialState.session ? partialState.session.profile : partialState.session === null ? null : this.state.profile,
    };
    this.notify();
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Error in AuthStateListener:', err);
      }
    });
  }

  /**
   * Inicializa o estado buscando sessao ativa
   */
  public async init(): Promise<void> {
    this.setState({ isLoading: true, error: null });
    try {
      const session = await this.authService.getCurrentSession();
      if (session && session.profile && session.profile.ativo) {
        this.setState({
          session,
          profile: session.profile,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        this.setState({
          session: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Falha ao restaurar sessão';
      this.setState({
        session: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMsg,
      });
    }
  }

  /**
   * Realiza login com email e senha
   */
  public async login(credentials: AuthCredentials): Promise<AuthSession> {
    this.setState({ isLoading: true, error: null });
    try {
      const session = await this.authService.login(credentials);
      this.setState({
        session,
        profile: session.profile,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return session;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao realizar login';
      this.setState({
        session: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMsg,
      });
      throw err;
    }
  }

  /**
   * Realiza logout
   */
  public async logout(): Promise<void> {
    this.setState({ isLoading: true });
    try {
      await this.authService.logout();
    } finally {
      this.setState({
        session: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }

  /**
   * Recarrega e valida o perfil atual
   */
  public async refreshProfile(): Promise<UserProfile | null> {
    if (!this.state.session) return null;
    try {
      const updatedProfile = await this.authService.verifyProfile(this.state.session.userId);
      const updatedSession: AuthSession = {
        ...this.state.session,
        profile: updatedProfile,
      };
      this.setState({
        session: updatedSession,
        profile: updatedProfile,
      });
      return updatedProfile;
    } catch (err) {
      await this.logout();
      throw err;
    }
  }

  /**
   * Helpers de seguranca e checagem de papel
   */
  public hasPermission(permission: Permission): boolean {
    return canUserPerform(this.state.profile, permission);
  }

  public canAccessRoute(pathname: string): RouteAccessDecision {
    return evaluateRouteAccess(pathname, this.state.profile, this.state.isAuthenticated);
  }

  public isAdmin(): boolean {
    return this.state.profile?.role === UserRole.ADMIN && this.state.profile.ativo === true;
  }

  public isCaixa(): boolean {
    return (
      (this.state.profile?.role === UserRole.CAIXA || this.state.profile?.role === UserRole.ADMIN) &&
      this.state.profile.ativo === true
    );
  }

  public isAtendente(): boolean {
    return this.state.profile?.ativo === true;
  }
}
