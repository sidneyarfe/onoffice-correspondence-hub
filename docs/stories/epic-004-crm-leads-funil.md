# Epic 004 — CRM de Leads & Funil de Contratação

**Status:** Draft (planejado — aguardando *draft* das stories por @sm)
**Owner:** @pm (Morgan) · Orquestração inicial: @aiox-master (Orion)
**Criado em:** 2026-06-24
**Projeto:** ON Office — Correspondence Hub (SaaS de escritório virtual / endereço fiscal)

## Decisões do usuário (fundadoras deste épico)

1. **CRM nativo, não Twenty.** Avaliado o Twenty CRM (open-source, standalone NestJS + Postgres
   próprio). Descartado para uso embutido: integração profunda exigida (InfinitePay, ZapSign,
   funil de contratação) tornaria a sincronização entre o Postgres do Twenty e o Supabase da ON
   Office o gargalo. **Construir nativo** no stack atual vence pela profundidade de integração.
2. **Iniciar contratação a partir do negócio = gerar contrato + cobrança no próprio deal.** Um
   botão dentro do negócio dispara `processar-contratacao` (ZapSign) **+** `criarLinkPagamento`
   (InfinitePay), reusando 100% do back-half do funil já construído no Epic 003. (Opção
   "mandar link público self-service" fica como evolução futura, não no escopo deste épico.)
3. **Épico completo de uma vez** (não faseado em MVP): entregar o funil ponta a ponta — captura
   de lead → gestão de relacionamento → contrato + cobrança → cliente.
4. **Etapas (stages) customizáveis** — pipeline padrão fornecido, mas guardado em **tabela de
   config** editável pela ON Office (sem migração para renomear/reordenar/adicionar etapas).
5. **Tags em contatos E em negócios** — taxonomia livre, multi-tag, para segmentar leads e deals.

## Objetivo

Dar à ON Office um **CRM funcional e profundamente integrado** que recepcione os leads das
campanhas de Google Ads (e, no futuro, Meta Ads / formulário nativo), gerencie o relacionamento
(contatos, negócios, atividades) e **conecte o lead ao funil de contratação existente** — do
nascimento no formulário da landing page até o negócio fechado e o cliente provisionado.

## Contexto (varredura brownfield — 2026-06-24)

Achados que **definem o escopo**:

- **🔴 Leads não são persistidos hoje (gargalo nº 1).** O formulário da LP de endereço fiscal de
  Belém (`site-onoffice/src/pages/LpEnderecoFiscalBelem.tsx`, `LeadForm.handleSubmit`,
  linhas 501–533) apenas (a) dispara conversão Google Ads (`trackLeadConversion`), (b) dispara
  Meta Pixel/CAPI (`trackMetaLead`) e (c) **abre o WhatsApp** com mensagem pré-preenchida.
  **Nenhuma escrita em banco.** Todo lead que preenche e não conclui o WhatsApp é **perdido**.
  Fechar isso é a Story 4.1 e é pequena.
- **✅ Mesma instância Supabase compartilhada.** `site-onoffice` e `onoffice-correspondence-hub`
  apontam ambos para `https://ifpqrugbpzqpapoaameo.supabase.co`. **Sem sync entre bancos** — o
  formulário escreve e o admin lê o mesmo banco.
- **✅ O back-half do funil já existe (Epic 003).** Reutilizável diretamente:
  - `contratacoes_clientes` — registro central pessoa/contrato (chaveado por e-mail; tem
    `status_contratacao`, `plano_id`, campos `zapsign_*`, pagamento).
  - `processar-contratacao` (Edge Function) — upsert do cliente + cria `cliente_planos`
    (assinatura) + gera contrato ZapSign por template do plano. Retorna `signing_url`.
  - `_shared/infinitepay.ts` → `criarLinkPagamento({items, orderNsu, webhookUrl, redirectUrl})`
    cria link one-off (cartão + PIX, centavos).
  - `infinitepay-webhook` / `zapsign-webhook` — confirmação de pagamento / assinatura.
  - `create-user-from-contratacao` — provisiona o login do cliente (senha temporária).
- **✅ Shell admin pronto e fácil de estender.** `AdminDashboard.tsx` tem `<Routes>` aninhado +
  `AdminSidebar` (array `menuItems`). Adicionar `/admin/crm` = 1 rota + 1 item de menu.
- **Stack compartilhado:** Vite + React 18 + TS + Tailwind + shadcn/ui + TanStack Query. Acesso
  a dados via hooks `use*.ts`. Padrão RLS admin: `EXISTS (SELECT 1 FROM public.profiles WHERE
  id = auth.uid() AND role = 'admin')`. Operações privilegiadas via Edge Function (service role).

## Arquitetura-alvo

**Funil ponta a ponta:**
```
Formulário Google Ads
  → Edge: capturar-lead (verify_jwt=false, service role, rate-limit)
  → crm_contatos (lead) + crm_negocios (deal @ etapa "Novo Lead"), com origem/UTM
  → (mantém WhatsApp + conversões GA/Meta)
        ↓ relacionamento: crm_atividades (nota/ligação/reunião/follow-up) + botão WhatsApp + tags
        ↓ deal avança pelas etapas (Kanban / lista, drag-and-drop)
  "Iniciar contratação" (no deal)
  → processar-contratacao (ZapSign) + criarLinkPagamento (InfinitePay)
  → mapeia contato → contratacoes_clientes; liga negocio.contratacao_id
        ↓ zapsign-webhook (assinado) / infinitepay-webhook (pago)
  → avança a etapa do negócio (→ Ganho) → create-user-from-contratacao → CLIENTE
```

**Dados (novas tabelas, todas no schema `public`, RLS admin-only; inserts de lead via Edge fn):**
- `crm_etapas` — etapas do pipeline (config editável: `nome`, `ordem`, `cor`, `tipo` ∈
  `aberto|ganho|perdido`, `ativo`). Seed com o pipeline padrão.
- `crm_tags` — taxonomia livre (`nome`, `cor`).
- `crm_contatos` — lead/contato: `nome`, `email`, `telefone`, `origem`
  (`google_ads|meta_ads|site|manual|indicacao`), `utm_*`, `observacoes`, `contratacao_id`
  (nullable, liga ao registro central quando vira contratação).
- `crm_negocios` — negócio/deal: `contato_id`, `titulo`, `valor_centavos`, `etapa_id`,
  `plano_id` (pretendido), `contratacao_id` (nullable), `status` derivado da etapa,
  `motivo_perda`, `responsavel`.
- `crm_atividades` — atividade: `negocio_id`, `tipo`
  (`nota|ligacao|reuniao|whatsapp|followup|email`), `descricao`, `data_atividade`, `concluida`,
  `responsavel`.
- `crm_contato_tags` / `crm_negocio_tags` — junções N:N de tags.

**Pipeline padrão (seed em `crm_etapas`, editável depois):**
`Novo Lead` → `Contato Feito` → `Qualificado` → `Contrato Enviado` → `Negociação` →
`Ganho` (tipo=ganho) / `Perdido` (tipo=perdido).

## Stories

| ID | Story | Tipo | Lead | Status |
|----|-------|------|------|--------|
| 4.0 | Fundação de dados: `crm_etapas` (config), `crm_tags`, `crm_contatos`, `crm_negocios`, `crm_atividades` + junções de tags + RLS admin-only + seed do pipeline padrão | DB | @data-engineer | Draft |
| 4.1 | Captura de lead: Edge fn `capturar-lead` (rate-limit + insert contato+negócio) e fiação do formulário da LP de Belém (persiste **antes** de abrir o WhatsApp; mantém GA/Meta) | Backend + FE (site-onoffice) | @dev | Draft |
| 4.2 | CRM Kanban + lista em `/admin/crm` (drag entre etapas, filtros por origem/tag/etapa) + item na sidebar | UI | @ux-design-expert + @dev | Draft |
| 4.3 | Detalhe do negócio: dados do contato, botão WhatsApp, timeline de atividades (criar/concluir), gestão de tags em contato e deal | UI | @ux-design-expert + @dev | Draft |
| 4.4 | "Iniciar contratação" no deal: gera contrato + cobrança (reusa `processar-contratacao` + `criarLinkPagamento`); liga `negocio.contratacao_id` | Backend | @dev | Draft |
| 4.5 | Auto-progressão: `zapsign-webhook`/`infinitepay-webhook` avançam a etapa do negócio (→ Ganho no pago); deal ganho conecta ao provisionamento existente | Backend | @dev | Draft |
| 4.6 | (Futuro) Ingestão de formulário nativo Meta Ads + relatório de conversão por origem | Backend + UI | @dev | Deferida |

**Dependências:** 4.1–4.5 dependem de 4.0. 4.4 depende de 4.2/4.3 (UI do deal) para o gatilho.
4.5 depende de 4.4 (precisa do `contratacao_id` ligado). 4.2 e 4.3 podem correr em paralelo após 4.0.

## Restrições

- Strings de UI e termos de domínio em **pt-BR**; nomes de campos/DB em pt-BR (`crm_contatos`,
  `crm_negocios`, `crm_atividades`, `etapa_id`…).
- **Skill `ui-ux-pro-max` obrigatória** antes de qualquer story de UI (4.2, 4.3).
- Brand tokens da plataforma (`on-lime #60FF00`, `on-dark #232323`, Work Sans). A LP de Belém usa
  os tokens próprios do site (`onoffice-green`, `onoffice-dark`, Montserrat) — respeitar cada repo.
- Edge Functions: deploy via Supabase CLI; `verify_jwt=false` só onde necessário
  (`capturar-lead`, webhooks). Segredos via Supabase secrets — nunca hardcoded.
- Gates por story: `npm run lint`, `npx tsc --noEmit`, `npm run build`. Sem test runner.
- `git push` / PR / deploy de Edge Functions: exclusivo **@devops**, somente sob ordem do usuário.

## Riscos

- **Captura anti-spam:** o endpoint público `capturar-lead` precisa de rate-limit (reusar
  `check_rate_limit` RPC) + honeypot (já existe no formulário) para não poluir o pipeline.
- **Dois repos, um banco:** mudanças em `site-onoffice` (Story 4.1) saem em deploy separado do
  hub; coordenar para o endpoint existir antes do formulário chamá-lo.
- **Modelo de admin duplicado:** RLS via `profiles.role='admin'`, mas o app também usa allowlist
  de e-mail. Admins por allowlist sem `role='admin'` no `profiles` não passariam na RLS de leitura
  do browser — validar na Story 4.0 (ou ler via Edge fn service-role como fallback).
- **Idempotência de webhooks (4.5):** ZapSign/InfinitePay reentregam — avançar etapa do negócio
  deve ser idempotente (dedupe por `document_token`/`order_nsu`).
- **Deduplicação de contato:** um mesmo e-mail pode reenviar o formulário — reusar contato por
  e-mail (espelhar a lógica de upsert por e-mail de `processar-contratacao`) e evitar deals duplicados.
- **Sem test runner:** gates por lint + `tsc --noEmit` + build + revisão manual; webhooks em staging.

## Deploy log (2026-06-24, @data-engineer/Dara)

- ✅ **Banco aplicado** via `supabase db push --db-url` (connection string direta — contornou o 403 de
  conta e a falta de Docker). Apenas `20260624210000` aplicada; histórico Lovable (hífen) é ignorado
  pela CLI; Epic 003 já registrado. 7 tabelas + RLS + seed (7 etapas) verificados.
- ✅ **Edge functions deployadas** (após login com a conta dona — `onoffice1893@gmail.com's Project`):
  `capturar-lead`, `zapsign-webhook`, `infinitepay-webhook` → HTTP 200. Descoberta: os webhooks
  **nunca tinham sido deployados** (back-half do Epic 003 não rodava via Edge Functions).
- ✅ **Smoke test** `capturar-lead`: POST real criou contato+negócio (depois removido).
- ⏭️ **`types.ts` regen**: bloqueado (gen types pede Docker; `--linked` daria 403 antes do login) —
  **não necessário** (ponte `crmFrom`). Refazer quando houver Docker ou via `--linked` agora logado.
- ⚠️ **Secrets de runtime faltando**: `INFINITEPAY_API_TOKEN` + `INFINITEPAY_HANDLE` ausentes;
  `ZAPSIGN_API_KEY` setado mas o código in-house lê `ZAPSIGN_API_TOKEN` (divergência). Bloqueia
  assinado→cobrança e o `processar-contratacao` in-house. Setar via `supabase secrets set`.
- ⚠️ **`processar-contratacao`**: versão deployada provavelmente é a ponte-n8n antiga; a in-house do
  repo (que a Story 4.4 espera) precisa de redeploy — decisão Epic 003/@devops.
- 🖥️ **Frontend**: `npm run build` OK (`dist/` pronto). Sem config de deploy no repo (host-side);
  publicação = push para main (auto-deploy do host) ou upload de `dist/` — handoff @devops.

## Refinamento de navegação & layout (2026-06-24)

- **Sidebar por módulos:** Geral (Dashboard) · **Comercial** (CRM, Contatos) · **Operacional**
  (Clientes, Produtos, Correspondências, Documentos, Financeiro, Equipe, Relatórios). Active-state
  passou a cobrir rotas aninhadas. (`AdminSidebar.tsx`)
- **Página Contatos** (`/admin/contatos`, `AdminContatos.tsx` + `useCrmContatos`): só os contatos —
  tabela com busca, filtro por origem, tags, nº de negócios, situação (Lead × Em contratação).
- **CRM full-height (sem scroll de página):** shell admin agora é `h-screen` com `main` como único
  container de rolагem; a página CRM é `h-full flex-col` e **só o board rola** (colunas com
  `overflow-y-auto`, board com `overflow-x-auto`). (`AdminDashboard.tsx`, `AdminCRM.tsx`,
  `CrmBoard.tsx`, `CrmListView.tsx` com header sticky). Demais páginas rolam dentro do `main`.

## Critérios de sucesso do épico

1. **Nenhum lead do Google Ads se perde** — todo envio de formulário vira `crm_contatos` +
   `crm_negocios`, com origem/UTM, antes mesmo de o WhatsApp abrir.
2. A equipe gerencia o relacionamento no `/admin/crm`: Kanban + lista, atividades, tags, WhatsApp.
3. As etapas do pipeline são **editáveis** pela ON Office sem deploy/migração.
4. A partir de um negócio, a equipe **gera contrato + cobrança** sem sair do CRM, reusando
   InfinitePay + ZapSign.
5. Pagamento/assinatura confirmados via webhook **avançam o negócio para Ganho** e o lead vira
   cliente provisionado — funil único, do formulário ao cliente.
