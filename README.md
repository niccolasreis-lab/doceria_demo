# 🍰 Doceria do Sr. Gilmar — Sistema de Comandas & PDV SaaS

> **SaaS gastronômico para controle em tempo real de salão, comandas e caixa para docerias, confeitarias e cafeterias.**

---

## 📌 1. Visão Geral da Demonstração (Modo Demo)

Este projeto foi construído para eliminar 100% o controle de comandas em papel, centralizando regras de negócio e cálculos de faturamento no backend e oferecendo duas frentes de interface:

1. **Frente de Caixa & Backoffice (Web Next.js 14 + Tailwind)**:
   - Fila em tempo real de mesas solicitando fechamento da conta.
   - Conferência de itens com adição de extras e estornos com justificativa.
   - Desconto inteligente (percentual ou valor fixo) com trava de limite e autorização de gerência.
   - Pagamento fracionado (Split Payment: Dinheiro com troco, Cartões, PIX e Vales).
   - Emissão e impressão de Cupom Térmico (80mm) pronto para impressoras não fiscais.
   - Dashboard analítico com curva horária, ranking de produtos e fechamento cego de caixa (Extrato Z).
   - CRUDs de Produtos (com alérgenos e margem) e Mesas por setor (Salão, Varanda, Deck, Balcão).

2. **Terminal Móvel de Atendimento (Mobile Expo / React Native)**:
   - Mapa de mesas com sinalização visual de status (*Livre*, *Ocupada*, *Pedindo Conta*).
   - Abertura instantânea de comanda na mesa.
   - Catálogo com categorização e busca rápida de produtos.
   - Lançamento de itens com adicionais e observações para a copa.
   - Sinalização de "Pedir Conta" com bloqueio automático para comandas sem itens.

3. **Backend Compartilhado (Appwrite)**:
   - Cálculos monetários seguros e atômicos em centavos inteiros.
   - 4 Functions centrais: `adicionar-item`, `solicitar-conta`, `fechar-comanda` e `fechamento-caixa-cron`.
   - Regras de Document Security e RBAC (`admin`, `caixa`, `atendente`).

---

## 🚀 2. Acesso Rápido / Perfis de Demonstração

Ao rodar a aplicação, utilize os perfis rápidos para demonstrar os diferentes fluxos operacionais:

| Perfil | Usuário Demo | PIN de Acesso | Escopo de Demonstração |
| :--- | :--- | :---: | :--- |
| **Operador de Caixa** | Mariana Silva | `0000` | Frente de caixa, conferência, pagamentos, emissão de cupons e sangrias. |
| **Administrador / Dono** | Sr. Gilmar Santos | `1234` | Dashboard geral, relatórios de faturamento, fechamento de caixa e CRUDs. |
| **Garçom / Atendente** | Carlos Eduardo | `1111` | Abertura de mesas, lançamento de pedidos e solicitação de conta. |

---

## 🛠️ 3. Arquitetura do Repositório

```
doceria_demo/
├── shared/             # DTOs, Enums, Interfaces e Contratos de Portas (PrintPort, NotificationPort)
├── backend/            # Schemas de Collections Appwrite, Seeds, Migrações e 4 Appwrite Functions
├── web/                # Next.js 14 App Router + Tailwind CSS (Caixa e Backoffice)
├── mobile/             # Expo React Native + TypeScript (Atendimento em Celular/Tablet)
├── tests/              # Suíte com 101 testes automatizados (100% Green)
├── PROJECT.md          # Especificação de requisitos funcionais e não funcionais
├── CONTRACTS.md        # Schemas de contratos e assinaturas das Functions
└── STATE.md            # Registro consolidado de execução e testes
```

---

## 🧪 4. Como Executar os Testes Automatizados

O sistema conta com 101 testes cobrindo todas as regras críticas de negócio:

```bash
# Executar todos os testes (Backend + Mobile)
npm run test:all

# Executar suíte do Backend Appwrite (62 testes)
npm run test:backend

# Executar suíte do App Mobile Expo (32 testes)
npm run test:mobile
```

---

## 💻 5. Como Rodar Localmente

### Pré-requisitos
- Node.js 18+ ou 20+
- npm ou pnpm

### Executando o Painel Web (Next.js 14)
```bash
cd web
npm install
npm run dev
# Acesse http://localhost:3000
```

### Executando o App Mobile (Expo)
```bash
cd mobile
npm install
npm run start
# Pressione 'w' para abrir na web ou escaneie o QR Code com o app Expo Go no celular
```

---

## 🌐 6. Instruções para Deploy

### Frontend Web (Vercel ou Easypanel / Docker)
1. Conecte o repositório no [Vercel](https://vercel.com).
2. Configure o **Root Directory** como `web`.
3. Variáveis de ambiente:
   - `NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1`
   - `NEXT_PUBLIC_APPWRITE_PROJECT_ID=doceria-gilmar-prod`

### Backend (Appwrite Cloud ou Self-Hosted via Easypanel)
1. Crie o projeto no console do Appwrite.
2. Execute o script de migração das collections:
   ```bash
   cd backend && npx tsx src/migrations/migrate.ts
   ```
3. Faça o deploy das Appwrite Functions com o Appwrite CLI:
   ```bash
   appwrite functions create
   ```
