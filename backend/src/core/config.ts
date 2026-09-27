/**
 * Appwrite Backend Configuration aligned with CONTRACTS.md and shared/
 */

export const CONFIG = {
  APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'http://localhost/v1',
  APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'doceria-sr-gilmar',
  APPWRITE_API_KEY: process.env.APPWRITE_API_KEY || '',
  DATABASE_ID: process.env.DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'doceria_main_db',
  COLLECTIONS: {
    PROFILES: 'profiles',
    PRODUTOS: 'produtos',
    MESAS: 'mesas',
    COMANDAS: 'comandas',
    ITENS_COMANDA: 'itens_comanda',
    PAGAMENTOS: 'pagamentos',
    FECHAMENTOS_CAIXA: 'fechamentos_caixa',
    NOTIFICACOES: 'notificacoes',
  },
  REALTIME_CHANNELS: {
    COMANDAS: 'databases.[DATABASE_ID].collections.comandas.documents',
    ITENS_COMANDA: 'databases.[DATABASE_ID].collections.itens_comanda.documents',
    MESAS: 'databases.[DATABASE_ID].collections.mesas.documents',
    NOTIFICACOES: 'databases.[DATABASE_ID].collections.notificacoes.documents',
  },
  EMPRESA: {
    NOME: 'Doceria do Sr. Gilmar',
    CNPJ: '12.345.678/0001-90',
    ENDERECO: 'Rua dos Doces Artesanais, 120 - Centro',
    TELEFONE: '(11) 98765-4321',
  },
} as const;
