import { UserProfile, UserRole } from '../types';
import { AuthCredentials, AuthSession } from './types';
import { isProfileActive } from './rbac';

export interface AuthServicePort {
  login(credentials: AuthCredentials): Promise<AuthSession>;
  logout(): Promise<void>;
  getCurrentSession(): Promise<AuthSession | null>;
  verifyProfile(userId: string): Promise<UserProfile>;
}

/**
 * Servico Mock de Autenticacao e Perfil para testes unitarios, modo offline e desenvolvimento
 */
export class MockAuthService implements AuthServicePort {
  private currentSession: AuthSession | null = null;
  private readonly profiles: Map<string, UserProfile> = new Map([
    [
      'admin-01',
      {
        $id: 'admin-01',
        nome: 'Sr. Gilmar (Admin)',
        email: 'admin@doceriagilmar.com.br',
        role: UserRole.ADMIN,
        ativo: true,
      },
    ],
    [
      'caixa-01',
      {
        $id: 'caixa-01',
        nome: 'Maria Clara (Caixa)',
        email: 'caixa@doceriagilmar.com.br',
        role: UserRole.CAIXA,
        ativo: true,
      },
    ],
    [
      'atendente-01',
      {
        $id: 'atendente-01',
        nome: 'João Silva (Atendente)',
        email: 'atendente@doceriagilmar.com.br',
        role: UserRole.ATENDENTE,
        ativo: true,
      },
    ],
    [
      'bloqueado-01',
      {
        $id: 'bloqueado-01',
        nome: 'Ex-Funcionário',
        email: 'bloqueado@doceriagilmar.com.br',
        role: UserRole.ATENDENTE,
        ativo: false,
      },
    ],
  ]);

  async login(credentials: AuthCredentials): Promise<AuthSession> {
    const email = credentials.email.toLowerCase().trim();
    let foundProfile: UserProfile | undefined;

    for (const p of this.profiles.values()) {
      if (p.email.toLowerCase() === email) {
        foundProfile = p;
        break;
      }
    }

    if (!foundProfile) {
      throw new Error('Credenciais inválidas ou usuário não cadastrado.');
    }

    if (!foundProfile.ativo) {
      throw new Error('Usuário inativo ou bloqueado no sistema.');
    }

    const session: AuthSession = {
      userId: foundProfile.$id,
      email: foundProfile.email,
      profile: foundProfile,
      token: `mock-session-token-${foundProfile.$id}`,
      expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    this.currentSession = session;
    return session;
  }

  async logout(): Promise<void> {
    this.currentSession = null;
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    return this.currentSession;
  }

  async verifyProfile(userId: string): Promise<UserProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error(`Perfil do usuário com ID '${userId}' não encontrado.`);
    }
    if (!profile.ativo) {
      throw new Error(`O usuário '${profile.nome}' está inativo.`);
    }
    return profile;
  }

  // Metodo utilitario para injetar perfis de teste
  public registerMockProfile(profile: UserProfile): void {
    this.profiles.set(profile.$id, profile);
  }
}

/**
 * Cliente Appwrite generico injetavel para compatibilidade Web e Mobile
 */
export interface AppwriteClientDependencies {
  account: {
    createEmailPasswordSession?: (email: string, pass: string) => Promise<{ userId: string; $id: string }>;
    createEmailSession?: (email: string, pass: string) => Promise<{ userId: string; $id: string }>;
    get: () => Promise<{ $id: string; email: string; name: string }>;
    deleteSession: (sessionId: string) => Promise<unknown>;
  };
  databases: {
    getDocument: (databaseId: string, collectionId: string, documentId: string) => Promise<unknown>;
  };
  databaseId: string;
  profilesCollectionId: string;
}

/**
 * Implementacao do servico de autenticacao integrado ao Appwrite
 */
export class AppwriteAuthService implements AuthServicePort {
  constructor(private readonly deps: AppwriteClientDependencies) {}

  async login(credentials: AuthCredentials): Promise<AuthSession> {
    const email = credentials.email.trim();
    const password = credentials.password;

    let appwriteSession: { userId: string; $id: string };

    if (this.deps.account.createEmailPasswordSession) {
      appwriteSession = await this.deps.account.createEmailPasswordSession(email, password);
    } else if (this.deps.account.createEmailSession) {
      appwriteSession = await this.deps.account.createEmailSession(email, password);
    } else {
      throw new Error('Método de login do Appwrite Account indisponível.');
    }

    const userId = appwriteSession.userId;
    const profile = await this.verifyProfile(userId);

    return {
      userId,
      email: profile.email || email,
      profile,
      token: appwriteSession.$id,
    };
  }

  async logout(): Promise<void> {
    try {
      await this.deps.account.deleteSession('current');
    } catch {
      // Ignora erro se ja estiver desconectado
    }
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const user = await this.deps.account.get();
      if (!user || !user.$id) return null;

      const profile = await this.verifyProfile(user.$id);
      return {
        userId: user.$id,
        email: user.email || profile.email,
        profile,
      };
    } catch {
      return null;
    }
  }

  async verifyProfile(userId: string): Promise<UserProfile> {
    try {
      const doc = (await this.deps.databases.getDocument(
        this.deps.databaseId,
        this.deps.profilesCollectionId,
        userId
      )) as unknown as Record<string, unknown>;

      const roleStr = String(doc.role || '').toLowerCase();
      let resolvedRole: UserRole;

      if (roleStr === 'admin') resolvedRole = UserRole.ADMIN;
      else if (roleStr === 'caixa') resolvedRole = UserRole.CAIXA;
      else if (roleStr === 'atendente' || roleStr === 'garcom') resolvedRole = UserRole.ATENDENTE;
      else {
        throw new Error(`Papel inválido ou não reconhecido no perfil: ${doc.role}`);
      }

      const profile: UserProfile = {
        $id: String(doc.$id || userId),
        nome: String(doc.nome || 'Usuário'),
        email: String(doc.email || ''),
        role: resolvedRole,
        ativo: doc.ativo === true,
        $createdAt: doc.$createdAt ? String(doc.$createdAt) : undefined,
        $updatedAt: doc.$updatedAt ? String(doc.$updatedAt) : undefined,
      };

      if (!isProfileActive(profile)) {
        throw new Error('Usuário inativo no banco de dados.');
      }

      return profile;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Falha na verificação de perfil de segurança: ${msg}`);
    }
  }
}
