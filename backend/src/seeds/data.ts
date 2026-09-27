import { MesaStatus, UserRole } from '../../../shared/types.js';

export interface SeedTable {
  numero: number;
  capacidade: number;
  status: MesaStatus;
}

export interface SeedProduct {
  nome: string;
  categoria: 'Bolos' | 'Doces Finos' | 'Bebidas' | 'Salgados' | 'Cafeteria';
  preco_centavos: number;
  descricao: string;
  disponivel: boolean;
  imagem_url?: string;
}

export interface SeedProfile {
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
}

export const SEED_TABLES: SeedTable[] = [
  { numero: 1, capacidade: 2, status: MesaStatus.LIVRE },
  { numero: 2, capacidade: 2, status: MesaStatus.LIVRE },
  { numero: 3, capacidade: 4, status: MesaStatus.LIVRE },
  { numero: 4, capacidade: 4, status: MesaStatus.LIVRE },
  { numero: 5, capacidade: 4, status: MesaStatus.LIVRE },
  { numero: 6, capacidade: 6, status: MesaStatus.LIVRE },
  { numero: 7, capacidade: 6, status: MesaStatus.LIVRE },
  { numero: 8, capacidade: 4, status: MesaStatus.LIVRE },
  { numero: 9, capacidade: 4, status: MesaStatus.LIVRE },
  { numero: 10, capacidade: 8, status: MesaStatus.LIVRE },
];

export const SEED_PRODUCTS: SeedProduct[] = [
  // Bolos
  {
    nome: 'Fatia de Bolo de Cenoura com Brigadeiro Belga',
    categoria: 'Bolos',
    preco_centavos: 1850,
    descricao: 'Massa fofinha de cenoura com cobertura vulcão de brigadeiro artesanal belga 54%.',
    disponivel: true,
  },
  {
    nome: 'Fatia de Red Velvet com Cream Cheese',
    categoria: 'Bolos',
    preco_centavos: 2200,
    descricao: 'Clássico bolo aveludado com camadas de frosting de cream cheese e toque de baunilha Bourbon.',
    disponivel: true,
  },
  {
    nome: 'Fatia de Bolo Trufado de Chocolate Supremo',
    categoria: 'Bolos',
    preco_centavos: 2400,
    descricao: 'Pão de ló 100% cacau, recheio de trufa de chocolate meio amargo e ganache brilhante.',
    disponivel: true,
  },

  // Doces Finos
  {
    nome: 'Brigadeiro Gourmet Tradicional (Unidade)',
    categoria: 'Doces Finos',
    preco_centavos: 650,
    descricao: 'Feito com leite condensado premium e granulado de chocolate belga Callebaut.',
    disponivel: true,
  },
  {
    nome: 'Brigadeiro de Pistache com Raspas de Chocolate Branco',
    categoria: 'Doces Finos',
    preco_centavos: 850,
    descricao: 'Pasta pura de pistache iraniano envolto em xerém de pistache tostado.',
    disponivel: true,
  },
  {
    nome: 'Quindim Dourado da Vovó',
    categoria: 'Doces Finos',
    preco_centavos: 900,
    descricao: 'Receita tradicional com gemas selecionadas, coco fresco ralado e manteiga de primeira.',
    disponivel: true,
  },
  {
    nome: 'Torta de Limão Siciliano com Merengue Suíço',
    categoria: 'Doces Finos',
    preco_centavos: 1950,
    descricao: 'Massa sablée crocante, curd cremoso de limão siciliano e merengue tostado no maçarico.',
    disponivel: true,
  },

  // Cafeteria
  {
    nome: 'Café Espresso Duplo Especial',
    categoria: 'Cafeteria',
    preco_centavos: 950,
    descricao: 'Grãos 100% arábica da Mogiana Paulista, notas de caramelo e chocolate.',
    disponivel: true,
  },
  {
    nome: 'Cappuccino Italiano com Canela e Cacau',
    categoria: 'Cafeteria',
    preco_centavos: 1400,
    descricao: 'Espresso clássico, leite vaporizado com microespuma sedosa e toque de cacau 100%.',
    disponivel: true,
  },
  {
    nome: 'Mocha de Doce de Leite da Casa',
    categoria: 'Cafeteria',
    preco_centavos: 1650,
    descricao: 'Espresso, leite vaporizado e uma generosa dose de doce de leite artesanal no fundo.',
    disponivel: true,
  },

  // Salgados
  {
    nome: 'Coxinha Cremosa com Frango e Catupiry Original',
    categoria: 'Salgados',
    preco_centavos: 1250,
    descricao: 'Massa fininha e crocante, recheio farto de peito de frango desfiado com Catupiry.',
    disponivel: true,
  },
  {
    nome: 'Empada de Palmito Pupunha e Alho Poró',
    categoria: 'Salgados',
    preco_centavos: 1300,
    descricao: 'Massa podre que desmancha na boca com recheio cremoso e suave.',
    disponivel: true,
  },
  {
    nome: 'Croissant Francês Amanteigado com Queijo e Presunto',
    categoria: 'Salgados',
    preco_centavos: 1750,
    descricao: 'Folhado legítimo com manteiga francesa, queijo gruyère e presunto especial.',
    disponivel: true,
  },

  // Bebidas
  {
    nome: 'Suco Natural de Laranja com Morango (400ml)',
    categoria: 'Bebidas',
    preco_centavos: 1350,
    descricao: 'Suco natural prensado na hora, sem conservantes ou adição de açúcar.',
    disponivel: true,
  },
  {
    nome: 'Água Mineral com Gás e Rodela de Limão (330ml)',
    categoria: 'Bebidas',
    preco_centavos: 700,
    descricao: 'Água mineral da fonte com gás natural.',
    disponivel: true,
  },
  {
    nome: 'Soda Italiana de Maçã Verde',
    categoria: 'Bebidas',
    preco_centavos: 1500,
    descricao: 'Xarope artesanal de maçã verde, água com gás e gelo.',
    disponivel: true,
  },
];

export const SEED_PROFILES: SeedProfile[] = [
  {
    nome: 'Sr. Gilmar (Proprietário & Admin)',
    email: 'gilmar@doceriadosrgilmar.com.br',
    role: UserRole.ADMIN,
    ativo: true,
  },
  {
    nome: 'Mariana Silva (Operadora de Caixa)',
    email: 'caixa.mariana@doceriadosrgilmar.com.br',
    role: UserRole.CAIXA,
    ativo: true,
  },
  {
    nome: 'Lucas Oliveira (Atendente / Garçom)',
    email: 'lucas.atendimento@doceriadosrgilmar.com.br',
    role: UserRole.ATENDENTE,
    ativo: true,
  },
];
