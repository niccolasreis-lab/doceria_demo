# Contratos de Dados e Interfaces — Doceria do Sr Gilmar

## 1. Enums e Constantes

```typescript
export enum UserRole {
  ADMIN = 'admin',
  CAIXA = 'caixa',
  ATENDENTE = 'atendente'
}

export enum MesaStatus {
  LIVRE = 'livre',
  OCUPADA = 'ocupada',
  PEDINDO_CONTA = 'pedindo_conta'
}

export enum ComandaStatus {
  ABERTA = 'aberta',
  PEDINDO_CONTA = 'pedindo_conta',
  PAGA = 'paga',
  CANCELADA = 'cancelada'
}

export enum FormaPagamento {
  DINHEIRO = 'dinheiro',
  PIX = 'pix',
  CARTAO_DEBITO = 'cartao_debito',
  CARTAO_CREDITO = 'cartao_credito',
  VALE_REFEICAO = 'vale_refeicao'
}

export enum TipoNotificacao {
  PEDIR_CONTA = 'pedir_conta',
  DESCONTO_ALTO = 'desconto_alto',
  FECHAMENTO_CAIXA = 'fechamento_caixa'
}
```

## 2. Collections do Appwrite (Banco de Dados)

### 2.1. `profiles`
- `$id`: string (UserId do Auth)
- `nome`: string
- `email`: string
- `role`: string ('admin' | 'caixa' | 'atendente')
- `ativo`: boolean
- `$createdAt`, `$updatedAt`

### 2.2. `produtos`
- `$id`: string
- `nome`: string
- `descricao`: string (opcional)
- `preco_centavos`: integer (valores monetários em centavos)
- `categoria`: string ('Bolos', 'Doces Finos', 'Bebidas', 'Salgados', 'Cafeteria')
- `disponivel`: boolean
- `imagem_url`: string (opcional)

### 2.3. `mesas`
- `$id`: string
- `numero`: integer (ex: 1, 2, 3...)
- `capacidade`: integer
- `status`: string ('livre' | 'ocupada' | 'pedindo_conta')
- `comanda_ativa_id`: string (opcional)

### 2.4. `comandas`
- `$id`: string
- `codigo`: string (ex: 'CMD-101')
- `mesa_id`: string
- `mesa_numero`: integer
- `atendente_id`: string
- `atendente_nome`: string
- `status`: string ('aberta' | 'pedindo_conta' | 'paga' | 'cancelada')
- `subtotal_centavos`: integer
- `desconto_centavos`: integer
- `total_centavos`: integer
- `observacoes`: string (opcional)
- `aberta_em`: string (ISO datetime)
- `fechada_em`: string (opcional, ISO datetime)

### 2.5. `itens_comanda`
- `$id`: string
- `comanda_id`: string
- `produto_id`: string
- `produto_nome`: string
- `quantidade`: integer
- `preco_unitario_centavos`: integer
- `subtotal_centavos`: integer
- `observacao`: string (opcional)
- `lancado_por_id`: string
- `lancado_por_nome`: string
- `criado_em`: string (ISO datetime)

### 2.6. `pagamentos`
- `$id`: string
- `comanda_id`: string
- `caixa_id`: string
- `caixa_nome`: string
- `forma_pagamento`: string ('dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'vale_refeicao')
- `valor_pago_centavos`: integer
- `troco_centavos`: integer
- `criado_em`: string (ISO datetime)

### 2.7. `fechamentos_caixa`
- `$id`: string
- `data_referencia`: string (YYYY-MM-DD)
- `total_vendas_centavos`: integer
- `total_dinheiro_centavos`: integer
- `total_pix_centavos`: integer
- `total_cartao_centavos`: integer
- `total_outros_centavos`: integer
- `total_descontos_centavos`: integer
- `quantidade_comandas`: integer
- `fechado_automatico`: boolean
- `fechado_por`: string (UserId ou 'SYSTEM_CRON')
- `gerado_em`: string (ISO datetime)

### 2.8. `notificacoes`
- `$id`: string
- `tipo`: string ('pedir_conta' | 'desconto_alto' | 'fechamento_caixa')
- `titulo`: string
- `mensagem`: string
- `destinatario_role`: string ('caixa' | 'admin')
- `comanda_id`: string (opcional)
- `lida`: boolean
- `criada_em`: string (ISO datetime)

## 3. Appwrite Functions (Lógica Centralizada)

### 3.1. `adicionar-item-comanda`
- **Input:** `{ comandaId: string, produtoId: string, quantidade: number, observacao?: string }`
- **Regras:**
  - Verifica se a comanda está com status `'aberta'`.
  - Obtém preço atualizado do produto.
  - Cria registro em `itens_comanda`.
  - Recalcula `subtotal_centavos` e `total_centavos` da comanda de forma atômica.
- **Output:** `{ sucesso: boolean, item: ItemComanda, novoTotalCentavos: number }`

### 3.2. `solicitar-conta`
- **Input:** `{ comandaId: string }`
- **Regras:**
  - Verifica se a comanda possui pelo menos 1 item lançado. Se não possuir, retorna erro `400: COMANDA_SEM_ITENS`.
  - Altera status da comanda para `'pedindo_conta'`.
  - Altera status da mesa para `'pedindo_conta'`.
  - Cria notificação na collection `notificacoes` com `destinatario_role: 'caixa'`.
- **Output:** `{ sucesso: boolean, status: 'pedindo_conta' }`

### 3.3. `fechar-comanda`
- **Input:** `{ comandaId: string, formaPagamento: FormaPagamento, descontoCentavos?: number, valorEntregueCentavos?: number }`
- **Regras:**
  - Valida se comanda possui itens.
  - Se `descontoCentavos` > 10% do subtotal, gera notificação de alerta para o `admin`.
  - Calcula `total = subtotal - desconto` e calcula troco se forma for `dinheiro`.
  - Registra em `pagamentos`.
  - Atualiza comanda para `status: 'paga'` e `fechada_em: now()`.
  - Atualiza mesa vinculada para `status: 'livre'` e `comanda_ativa_id: null`.
  - Retorna payload pronto para impressão de cupom.
- **Output:** `{ sucesso: boolean, pagamentoId: string, cupomPayload: CupomImpressao }`

### 3.4. `fechamento-caixa-cron`
- **Trigger:** Cron `59 23 * * *` (ou acionamento manual por admin).
- **Regras:**
  - Agrega todas as comandas pagas no dia atual.
  - Consolida totais por forma de pagamento e descontos.
  - Cria registro na collection `fechamentos_caixa`.
  - Cria notificação de resumo para o admin.
- **Output:** `{ sucesso: boolean, fechamentoId: string, totalVendasCentavos: number }`

## 4. Contratos de Portas de Integração

### 4.1. `PrintPort`
```typescript
export interface CupomImpressao {
  empresa: {
    nome: string;
    cnpj: string;
    endereco: string;
    telefone: string;
  };
  comanda: {
    codigo: string;
    mesa: number;
    atendente: string;
    abertaEm: string;
    fechadaEm: string;
  };
  itens: Array<{
    nome: string;
    quantidade: number;
    precoUnitarioCentavos: number;
    subtotalCentavos: number;
  }>;
  subtotalCentavos: number;
  descontoCentavos: number;
  totalCentavos: number;
  formaPagamento: FormaPagamento;
  valorPagoCentavos: number;
  trocoCentavos: number;
}

export interface PrintResult {
  sucesso: boolean;
  mensagem?: string;
  timestamp: string;
}

export interface PrintPort {
  imprimirCupom(cupom: CupomImpressao): Promise<PrintResult>;
}
```

### 4.2. `NotificationPort`
```typescript
export interface NotificationPayload {
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  destinatarioRole: UserRole;
  comandaId?: string;
}

export interface NotificationPort {
  enviarNotificacao(payload: NotificationPayload): Promise<{ sucesso: boolean; id?: string }>;
}
```

## 5. Envelope Padrão e Códigos de Erro

```typescript
export enum ErrorCode {
  COMANDA_NAO_ENCONTRADA = 'COMANDA_NAO_ENCONTRADA',
  COMANDA_FECHADA = 'COMANDA_FECHADA',
  COMANDA_SEM_ITENS = 'COMANDA_SEM_ITENS',
  PRODUTO_NAO_ENCONTRADO = 'PRODUTO_NAO_ENCONTRADO',
  PRODUTO_INDISPONIVEL = 'PRODUTO_INDISPONIVEL',
  DESCONTO_INVALIDO = 'DESCONTO_INVALIDO',
  VALOR_INSUFICIENTE = 'VALOR_INSUFICIENTE',
  NAO_AUTORIZADO = 'NAO_AUTORIZADO',
  ERRO_INTERNO = 'ERRO_INTERNO'
}

export interface ApiResponse<T> {
  sucesso: boolean;
  data?: T;
  erro?: {
    codigo: ErrorCode | string;
    mensagem: string;
    detalhes?: unknown;
  };
}
```
