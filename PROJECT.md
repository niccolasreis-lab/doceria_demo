# DOCERIA DO SR GILMAR — Sistema de Comandas SaaS

## 1. Visão Geral
SaaS para docerias e confeitarias que digitaliza o controle de comandas, substituindo as comandas em papel por um sistema ágil e integrado em tempo real entre salão (mobile) e caixa/administração (web).

## 2. Arquitetura do Sistema
- **Estrutura:** Flat folders (`shared/`, `backend/`, `web/`, `mobile/`).
- **Backend Compartilhado:** Appwrite (Database, Auth, Realtime, Functions, Storage).
- **Frontend Web:** Next.js 14 (App Router) + Tailwind CSS + Lucide Icons + Appwrite Web SDK.
- **App Mobile:** Expo (React Native) + TypeScript + Appwrite Mobile SDK.
- **Tipos Compartilhados:** `shared/` contendo DTOs, Enums, Interfaces e Contratos de Portas.

## 3. Divisão de Responsabilidades por Frente
### 3.1. Painel Web (`web/`)
- **Caixa:**
  - Fila de comandas prontas e "pedindo conta" em tempo real.
  - Conferência de itens lançados.
  - Aplicação de desconto com validação de limite.
  - Seleção de múltiplas formas de pagamento (Dinheiro, PIX, Cartão de Débito, Cartão de Crédito, Vale).
  - Fechamento da comanda e emissão/impressão de cupom não-fiscal.
- **Admin / Dono:**
  - Dashboard em tempo real (comandas ativas, faturamento do dia, produtos mais vendidos, ticket médio).
  - CRUD completo de Produtos (nome, categoria, preço unitário, imagem, disponibilidade).
  - CRUD completo de Mesas (número da mesa, capacidade, status atual).
  - Gestão de Usuários e Perfis (Atendente, Caixa, Admin).
  - Relatório diário consolidado e histórico de comandas.
  - Fechamentos de caixa diários (valores exclusivos de visualização do admin).

### 3.2. App Mobile (`mobile/`)
- **Atendente:**
  - Login seguro e seleção de perfil.
  - Mapa de mesas com status visual (Livre, Ocupada, Pedindo Conta).
  - Abertura de comanda vinculada à mesa.
  - Catálogo de produtos por categorias com busca rápida.
  - Lançamento de itens na comanda com quantidades e observações.
  - Sinalização de "Pedir Conta" para alertar o caixa em tempo real.
  - Extrato detalhado da comanda na mesa.

### 3.3. Backend Appwrite (`backend/`)
- **Collections:** `profiles`, `produtos`, `mesas`, `comandas`, `itens_comanda`, `pagamentos`, `fechamentos_caixa`, `notificacoes`.
- **Regras Centralizadas:**
  - Totais e subtotais calculados exclusivamente no backend.
  - Bloqueio de fechamento ou "pedir conta" em comandas vazias.
  - Notificação automática ao caixa via Realtime no evento de "Pedir Conta".
  - Notificação ao admin quando desconto ultrapassa margem máxima (ex: > 10%).
  - Função agendada (Cron) para fechamento e consolidação diária do caixa às 23:59.

## 4. Time de Agentes (Maestri Workspace)
- **Atlas (T1 ARCHITECT):** Governança técnica, schemas e especificações de contratos.
- **Forge (T2 BACKEND):** Appwrite Collections, Functions, Realtime e scripts de seed.
- **Canvas (T3 FRONTEND):** Telas Next.js 14 do Caixa e Admin, Dashboard e Relatórios.
- **Pulse (Mobile Engineer):** App Expo do Atendente e Caixa Móvel.
- **Vault (T6 SECURITY):** Autenticação Appwrite, RBAC e segurança por Document Security.
- **Signal (T7 DEVOPS & INTEGRATIONS):** Configurações, PrintPort (Impressão) e NotificationPort.
- **Sentinel (T5 QA):** Testes unitários, testes de integração e matriz de validação e2e.
