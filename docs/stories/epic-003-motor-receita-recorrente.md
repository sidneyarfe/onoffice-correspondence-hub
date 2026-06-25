# Epic 003 — Motor de Receita Recorrente (Memberships + Cobrança In-House)

**Status:** Draft (planejado — aguardando *draft* das stories por @sm)
**Owner:** @pm (Morgan) · Orquestração inicial: @aiox-master (Orion)
**Criado em:** 2026-06-16
**Projeto:** ON Office — Correspondence Hub (SaaS de escritório virtual / endereço fiscal)

## Decisões do usuário (fundadoras deste épico)

1. **Pivot para Membership:** cada cliente pode contratar **múltiplos produtos/planos**
   (assinaturas), em vez do modelo atual "uma contratação = um plano por cliente".
2. **Independência do n8n:** trazer o processo de venda → formulário → geração de contrato →
   assinatura → pagamento → login para **dentro da plataforma** (Supabase Edge Functions +
   integrações diretas), eliminando o n8n do **caminho crítico**.
3. **Gateway de pagamento oficial: InfinitePay** (Checkout API). Os campos `pagarme_*` (schema)
   e o uso de Mercado Pago (em `get-financial-overview`) passam a ser **legados** a substituir.
4. **Modelo de renovação: "nós geramos cada cobrança".** Um job agendado nosso cria **uma
   cobrança por ciclo** por assinatura, via API InfinitePay, e a dispara ao cliente. Sem
   depender de recorrência nativa do gateway (a Checkout API da InfinitePay é one-off de
   qualquer forma — só cartão e PIX, até 12x).

## Objetivo

Transformar a ON Office em um **motor de receita recorrente autônomo**: vender múltiplos
serviços por cliente, calcular automaticamente o período contratado, avisar o que está a
vencer, projetar faturamento mensal/anual (MRR/ARR), apontar **quem cobrar**, e **gerar +
disparar as cobranças de renovação automaticamente** via InfinitePay — tudo sem n8n no caminho
crítico.

O motor de receita é o **ápice** e depende de duas fundações: (a) a **assinatura** como unidade
de cobrança (membership) e (b) a posse **in-house** da chamada de cobrança (desacoplamento).

## Contexto (varredura brownfield — 2026-06-16)

Achados que **redefinem o escopo** em relação à proposta original do usuário:

- **A tabela `assinaturas` proposta já existe — é `cliente_planos`.** É a junção
  cliente ↔ plano, multi-assinatura, com `status` (`ativo|suspenso|cancelado`), `data_inicio`,
  `proximo_vencimento`, `valor_pago_centavos`, `data_ultimo_pagamento`, FKs para
  `contratacoes_clientes` e `planos` (`src/integrations/supabase/types.ts:155`), com UNIQUE
  `(cliente_id, plano_id, data_contratacao)` permitindo N assinaturas por cliente. **Porém a
  tabela está DORMENTE:** o único escritor em produção é o fluxo admin de edição manual de
  cliente (`useAdminClients.ts:286-331`, insere 1 linha quando há `plano_id`); o hook dedicado
  `useClientPlanos` está definido mas **nunca é importado** (dead code a reativar) e
  `ClientPlanosModal` **não toca a tabela**; **nenhuma Edge Function escreve nela**. → **A pivot
  de dados não é "criar tabela"; é "ligar o funil/onboarding à tabela que já existe (hoje só
  alimentada por edição manual no admin)" + mover campos de contrato/pagamento para a
  granularidade de assinatura + backfill.**
- **Hierarquia já pronta:** `produtos` → `planos` (FK `produto_id`) → `cliente_planos`. Cada
  `plano` já carrega `pagarme_plan_id`, `zapsign_template_id_pf`, `zapsign_template_id_pj`,
  `periodicidade`, `preco_em_centavos`, `numero_parcelas`, `valor_parcela_centavos`,
  `entregaveis` (`types.ts:626`). Config de contrato/pagamento já é **por plano**.
- **`contratacoes_clientes` mistura "pessoa" e "contrato único":** além dos dados pessoais,
  guarda `plano_id`, `plano_selecionado`, `produto_id`, `preco`, `proximo_vencimento`,
  `metodo_pagamento`, `zapsign_*`, `pagarme_*` (`types.ts:212`). Esses campos de assinatura
  única precisam migrar para `cliente_planos`.
- **`pagamentos` aponta para `contratacao_id`, não para a assinatura** (`types.ts:584`) — falta
  granularidade por assinatura para cobrança por ciclo. Pior: `contratacao_id` é UUID **sem FK**
  (sem `REFERENCES`) e não há `plano_id`/`cliente_plano_id` — pagamentos não podem ser atribuídos
  a uma assinatura específica hoje.
- **Funil é single-plan:** `DynamicPlanSelection` lista planos (`useProducts.fetchPlanosAtivos`)
  e cada card leva a `/cadastro` com **um** `selectedPlanData` (`DynamicPlanSelection.tsx:175`).
  `SignupForm.handleSubmit` envia `plano_selecionado` (string) ao **n8n** via
  `processarContratacao` e depois faz polling de `get-contratacao-status`
  (`SignupForm.tsx:118-164`). Comentários explícitos: *"Enviar dados para o n8n"*,
  *"O n8n processará: salvar contratação, preparar contrato..."*.
- **Ponte n8n:** `API_ENDPOINTS.processarContratacao = ${SUPABASE_URL}/functions/v1/processar-contratacao`
  (`src/lib/api.ts:4`) — **essa function não existe no repo** (`supabase/functions/`); é
  deployed-only e é a ponte para o n8n. `useContractProcess` é **apenas estado de UI**
  (`form_filling → ... → completed`), não orquestra nada.
- **Cálculo de vencimento já existe no banco:** RPCs `calcular_proximo_vencimento` /
  `calcular_vencimento_por_periodicidade` + trigger `trigger_auto_calcular_vencimento_ativo`
  (`supabase/migrations/20250915215443...sql`). Há **duplicação** (SQL trigger + JS no hook) a
  consolidar.
- **RPCs concorrentes:** `calcular_vencimento_por_periodicidade(data_inicio, periodicidade)`
  (membership-aware) × `calcular_proximo_vencimento(data_contratacao, plano)` (legado, baseado em
  strings `'1 ANO'`/`'1 MES'`). O trigger `auto_assign_product_plan` preenche `plano_id`/
  `produto_id` em `contratacoes_clientes` quando vira ATIVO — mas **só escreve em
  `contratacoes_clientes`, nunca em `cliente_planos`** (raiz da desconexão).
- **Drift de schema:** o trigger grava `proximo_vencimento_editavel`, coluna que **não existe no
  `types.ts` regenerado** (lá só há `proximo_vencimento`) — migrations divergem do schema vivo.
  Regenerar `types.ts` e reconciliar triggers **antes** de qualquer migração.
- **`get-financial-overview` está quebrado / fabricado:** usa **preços hardcoded**
  (`'1 MES':129, '1 ANO':99, '2 ANOS':69`), lê o campo legado `plano_selecionado`, **simula**
  inadimplentes ("*Simular alguns clientes em atraso para demonstração*") e consulta **Mercado
  Pago** (`MERCADOPAGO_ACCESS_TOKEN`, `client.mercadopago_payment_id` — coluna que nem existe
  mais). Precisa ser **reconstruído** sobre `cliente_planos` + `planos` + InfinitePay.
- **InfinitePay Checkout API** (validada na doc oficial): `POST https://api.checkout.infinitepay.io/links`
  cria link one-off com `handle` + `items[]` (preço em **centavos**) + `webhook_url` +
  `redirect_url`; métodos cartão e PIX (até 12x); webhook no pagamento aprovado envia
  `invoice_slug, amount, paid_amount, installments, capture_method, transaction_nsu, order_nsu,
  receipt_url, items`; re-checagem via `POST /payment_check`. **Sem recorrência nativa** na
  Checkout API → confirma o modelo "nós geramos cada cobrança".

## Sequenciamento (resposta à pergunta do usuário: membership antes ou depois do n8n?)

**Eles convergem.** Para clientes novos, a assinatura nasce no onboarding — que hoje passa pelo
n8n. Logo, **o desacoplamento vem junto com a criação de memberships**: a nova pipeline
in-house é, ao mesmo tempo, o desacoplamento e o mecanismo que cria assinaturas. A tabela
`cliente_planos` já existe e suporta N assinaturas (hoje só escrita por edição manual no admin;
`useClientPlanos` é dead code a reativar), então o esforço real é: fundação de dados → pipeline
in-house (decoupling + membership) → UX multi-produto → motor de receita.

Ordem recomendada: **Fase 0 → Fase 1 → Fase 2 → Fase 3** (dependência estrita; Fase 2 e 3
exigem 0 e 1).

> **Validação cruzada (painel de design — 2 lentes concluídas):** divergiram no
> sequenciamento — *risk-first* recomendou **membership-first** (aditivo, reversível, não toca o
> caminho de receita primeiro) e *effort-first* recomendou **decoupling-first** (o orquestrador
> novo deve gravar `cliente_planos` nativamente, evitando reescrever o funil duas vezes). Ambas
> convergem no **mesmo modelo de dados** e em **não** criar `assinaturas`. **Resolução adotada:**
> fundação de dados aditiva primeiro (Fase 0) → desacoplamento com o orquestrador já
> *membership-aware* (Fase 1), rodando em **modo-sombra + feature flags + n8n quente para
> rollback** → pega a espinha do effort-first com o aparato de segurança do risk-first.

## Arquitetura-alvo

**Dados (membership como unidade de cobrança):**
- `cliente_planos` vira o **registro único de assinatura**: ganha campos de contrato/pagamento
  por assinatura (`zapsign_document_token`, `zapsign_signing_url`, `zapsign_signed_at`,
  `infinitepay_order_nsu`, `infinitepay_slug`, `payment_link`, `paid_at`, `metodo_pagamento`,
  `status` ampliado: `aguardando_assinatura|aguardando_pagamento|ativo|vencido|suspenso|cancelado`).
- `pagamentos` passa a referenciar `cliente_plano_id` (mantém `contratacao_id` para
  compatibilidade durante a transição).
- `contratacoes_clientes` é "afinada" para **pessoa/conta**; campos single-plan tornam-se
  legados (lidos durante a transição, depois removidos).

**Fluxo desacoplado (substitui o n8n no caminho crítico):**
```
Funil (multi-produto) → Edge: processar-contratacao (in-house)
  → upsert cliente + cria cliente_planos (status aguardando_assinatura)
  → gera contrato ZapSign (plano.zapsign_template_id_pf/pj) → retorna signing_url
Webhook ZapSign (assinado) → status aguardando_pagamento
  → cria link InfinitePay (POST /links, order_nsu = pagamento.id, webhook_url = nosso)
  → notifica cliente (link de pagamento)
Webhook InfinitePay (pago) → status ativo + proximo_vencimento
  → registra pagamentos (por assinatura) → provisiona usuário (reuso
    create-user-from-contratacao) → envia credenciais
```

**Motor de receita (job agendado — pg_cron / Supabase Scheduled Function):**
- Varredura diária de `cliente_planos.proximo_vencimento` → alertas + lista "quem cobrar".
- Geração de renovação: cria `pagamentos` + link InfinitePay por assinatura a vencer e dispara
  ao cliente.
- Conciliação no webhook pago → avança `proximo_vencimento`; suspensão pós-carência.
- MRR/ARR: agrega `cliente_planos` ativos por `periodicidade` normalizada (mensal/anual).

## Stories

| ID | Fase | Story | Tipo | Status |
|----|------|-------|------|--------|
| 3.1 | 0 — Fundação de dados | Estender `cliente_planos` como registro único de assinatura (campos de contrato/pagamento **por assinatura** + **snapshot de preço** em `valor_pago_centavos`/`preco_snapshot_centavos` + `produto_id` denormalizado; **assinatura é chaveada pelo próprio `id` — duplicatas do mesmo plano permitidas, SEM índice único parcial**) + repontar `pagamentos` para `cliente_plano_id` (hoje **sem FK**) | DB | ✅ **Done** |
| 3.2 | 0 — Fundação de dados | Consolidar cálculo de vencimento em `cliente_planos` (trigger/RPC único; remover duplicação JS) | DB | ✅ **Done** |
| 3.3 | 0 — Fundação de dados | Migração & backfill zero-downtime: 1 `cliente_planos` por cliente ativo a partir de `contratacoes_clientes`; marcar campos single-plan como legados | DB | ✅ **Done** |
| 3.4 | 1 — Pipeline in-house | Edge function `processar-contratacao` in-house (upsert cliente + cria assinatura pendente + gera contrato ZapSign) — **retorna o `contratacao_id`/`cliente_plano_id` real** ao browser, eliminando o polling frágil por `email_timestamp` no `localStorage` (`SignupForm.tsx:151`) | Backend | 🟡 **Code-complete** (deploy/secret/e2e gated) |
| 3.5 | 1 — Pipeline in-house | Webhook ZapSign (assinado → cria link InfinitePay + notifica cliente) | Backend | 🟡 **Code-complete** (deploy/secret/e2e gated) |
| 3.6 | 1 — Pipeline in-house | Integração InfinitePay (`POST /links`) + Webhook InfinitePay (pago → ativa assinatura + provisiona usuário + registra pagamento) | Backend | 🟡 **Code-complete** (deploy/secret/e2e gated) |
| 3.7 | 1 — Pipeline in-house | Migrar páginas de acompanhamento (Aguardando/Processando/Sucesso) ao novo fluxo; remover n8n do caminho crítico | Frontend | Draft |
| 3.8 | 2 — Funil multi-produto | ~~Funil público multi-produto (carrinho)~~ → **Deferida** (decisão 2026-06-24: "1 por vez + add-on logado"; carrinho = evolução futura). Multi-produto entregue via 3.9. | UI | Deferida |
| 3.9 | 2 — Funil multi-produto | "Contratar novo produto" para cliente logado (esconde produtos já ativos; reusa dados) + "Minhas Assinaturas" no dashboard cliente | UI | Draft |
| 3.10 | 2 — Funil multi-produto | Admin: `AdminClients` exibe N assinaturas/cliente (reativar `useClientPlanos` — hoje dead code; `ClientPlanosModal` não usa a tabela); corrigir `useAdminClients` que **deixa linhas órfãs** na troca de plano e **hardcoda `total_planos=1`** | UI | Draft |
| 3.11 | 3 — Motor de receita | Reconstruir `get-financial-overview` sobre dados reais (MRR/ARR por periodicidade; remover preços hardcoded, simulação e Mercado Pago) | Backend | Draft |
| 3.12 | 3 — Motor de receita | Radar de vencimento: job agendado → alertas admin + lista "quem cobrar" | Backend | Draft |
| 3.13 | 3 — Motor de receita | Geração automática de renovação: job cria `pagamentos` + link InfinitePay por assinatura a vencer e dispara ao cliente | Backend | Draft |
| 3.14 | 3 — Motor de receita | Conciliação & inadimplência (webhook pago → avança vencimento; suspensão pós-carência) + painel financeiro (MRR/ARR/projeção/atraso/churn) | UI+Backend | Draft |

**Dependências:** 3.4 depende de 3.1; 3.6 depende de 3.1 + integração InfinitePay; 3.8/3.9/3.10
dependem da Fase 1; toda a Fase 3 depende das Fases 0–2. 3.5/3.6 podem rodar em paralelo após 3.4.

## Estratégia de migração (proteger clientes vivos)

- **Aditiva primeiro:** adicionar colunas novas em `cliente_planos`/`pagamentos` sem remover as
  antigas (`contratacoes_clientes` continua legível).
- **Backfill idempotente:** script cria uma `cliente_planos` por cliente ATIVO a partir de
  `plano_id`/`plano_selecionado`/`proximo_vencimento`; reexecutável sem duplicar.
- **Dupla escrita transitória (se necessário):** durante a Fase 1, escrever em `cliente_planos`
  e (opcionalmente) espelhar em `contratacoes_clientes` até `get-financial-overview` e relatórios
  migrarem.
- **Cutover do funil:** trocar `processarContratacao` (n8n) pela edge function in-house atrás de
  flag; manter rollback.
- **View de reconciliação como gate:** criar uma view SQL que compara os scalars de plano/preço/
  vencimento de `contratacoes_clientes` com o valor derivado de `cliente_planos` por cliente.
  Nenhum flag vai a 100% enquanto o diff ≠ 0.
- **Modo-sombra + cutover gradual:** o orquestrador in-house roda primeiro só para tráfego de
  teste/admin, depois um % do `/cadastro`, depois 100% — com o webhook n8n **quente** para revert
  em um clique. Webhooks com **idempotency key** (`contratacao_id` + `gateway_payment_id`) para
  retries não duplicarem assinatura/usuário.
- **Drenar onboardings em voo:** contratos criados no n8n mas ainda não assinados/pagos no momento
  do cutover precisam de plano de migração/drenagem para nenhum cliente ficar preso entre os dois
  pipelines.
- **Descontinuação:** só remover campos single-plan de `contratacoes_clientes` após todos os
  consumidores migrarem (story de limpeza ao fim da Fase 3) — inclui remover seams mortos:
  link MercadoPago hardcoded (`InstrucoesPagamento.tsx:9`), `asaas_payment_link` em
  `get-contratacao-status`, e o endpoint órfão `processar-contratacao` em `api.ts`.

## Riscos

- **Drift de gateway:** schema (Pagar.me) × função financeira (Mercado Pago) × decisão (InfinitePay).
  Risco de código morto e segredos órfãos — exige limpeza explícita.
- **`get-financial-overview` fabricado:** qualquer número financeiro hoje é parcialmente fictício;
  a reconstrução muda KPIs exibidos (comunicar).
- **Webhooks idempotentes:** ZapSign e InfinitePay podem reentregar — exigir dedupe por
  `order_nsu`/`slug`/`document_token`.
- **Backfill incorreto** pode gerar vencimentos errados em clientes vivos — validar amostra antes.
- **Drift migrations × schema vivo** (`proximo_vencimento_editavel` ausente nos types; RPCs de
  vencimento duplicadas; `pagamentos` sem FK): regenerar `types.ts` e auditar triggers/RPCs antes
  de qualquer migração — sob risco de migrar contra um schema que o código não enxerga.
- **Sem test runner:** gates por `npm run lint` + `npx tsc --noEmit` + `npm run build` e revisão
  manual; webhooks exigem teste em staging.
- **Provisionamento de usuário:** reaproveitar `create-user-from-contratacao` (senha temporária)
  exige que a assinatura, não a contratação, vire o gatilho.
- **✅ RESOLVIDO — Lógica oculta no n8n (era o maior bloqueador da Fase 1):** o usuário exportou o
  workflow (`docs/zLlpsqMLo16TDBW6-SISTEMA_ON.json`) e a lógica foi extraída para
  `docs/architecture/n8n-sistema-on-reference.md` — 5 sub-fluxos, template IDs ZapSign por
  plano×tipo, `dataVars` do contrato, templates de e-mail (Resend), URLs de redirect, vocabulário
  de status e a edge fn de provisionamento. **Fase 1 desbloqueada.**
- **🔴 NOVO — Segredo Pagar.me vazado no export:** o JSON contém uma **secret key Pagar.me de
  produção hardcoded** (nó `5B`, base64 no header `authorization`), agora no histórico do git.
  **Rotacionar a chave** e avaliar limpeza de histórico. Ver topo do reference doc.
- **Price drift histórico:** hoje o preço é unido ao vivo de `planos` — editar o preço de um plano
  reescreve o histórico de faturamento. Mitigado pelo **snapshot de preço** na assinatura (Story 3.1).
- **Vocabulário de status divergente:** `cliente_planos.status` é minúsculo (`ativo`) e
  `contratacoes_clientes.status_contratacao` é maiúsculo (`ATIVO`) — definir mapa canônico + status
  de contrato derivado (ex.: "ATIVO se qualquer assinatura ativa") para gating de acesso.

## Decisões resolvidas (2026-06-24, @aiox-master)

- **Embedding do onboarding → contrato EMBEDDED, pagamento em POPUP.** Pesquisa nas docs oficiais
  (2026-06-24): **ZapSign tem Widget oficial** (iframe `app.zapsign.com.br/verificar/{signer_token}`,
  `allow="camera"`) com eventos client-side `zs-doc-loaded`/`zs-doc-signed`/`zs-signed-file-ready` →
  assinatura **embedded** com rastreio em tempo real na nossa tela. **InfinitePay NÃO embute** (só
  Checkout Integrado = link hospedado/redirect, e InfiniteTap = presencial; sem checkout transparente/
  SDK/iframe/PIX-BRCode). **Decisão do usuário:** embutir o contrato e abrir o pagamento InfinitePay
  em **popup controlado** (`window.open`, volta sozinho), mantendo o provedor e a integração 3.5/3.6.
  Rastreio do pagamento = nível webhook (link criado → pago/falhou). Embedding pleno do pagamento
  exigiria trocar de provedor (Mercado Pago Bricks / Pagar.me transparente / Asaas) — **não escolhido**.
  → Impacta Story 3.7. Ajuste backend: `processar-contratacao` precisa retornar `signers[0].token`.

## Decisões resolvidas (2026-06-16, @aiox-master)

- **#6 Mesmo plano duas vezes → SIM, permitido.** Um cliente pode ter N assinaturas ATIVAS do
  mesmo `plano_id` (ex.: 2 endereços fiscais). A assinatura é chaveada pelo próprio `id`; **não
  haverá** índice único parcial `(cliente_id, plano_id) WHERE status='ativo'` (impacta Story 3.1).
- **#8 Granularidade do contrato → POR ASSINATURA.** Cada `cliente_planos` carrega seu próprio
  contrato ZapSign + cobrança InfinitePay + pagamento. Todos os campos `zapsign_*`/`infinitepay_*`/
  pagamento ficam na linha da assinatura (confirma o destino dos campos na Story 3.1).
- **#9 Assets do n8n → fornecidos e extraídos.** Ver `docs/architecture/n8n-sistema-on-reference.md`.
- **#7 Modelo de faturamento InfinitePay → N cobranças independentes por assinatura.** A Checkout API
  é link one-off (sem objeto "customer"); cada cobrança é keyed por `order_nsu = cliente_plano_id`.
  Alinha com #8 (por assinatura).
- **#2 n8n periférico → e-mails transacionais ficam como follow-up.** O caminho crítico (contrato →
  cobrança → ativação → provisionamento) é in-house; e-mails (Resend) são peri­féricos por ora.

## Decisões em aberto (confirmar antes/na Fase 1)

1. **ZapSign permanece** como provedor de assinatura (templates já configurados por plano) ou
   também será revisto? (Assumido: **permanece**.)
2. **n8n periférico:** manter o n8n para tarefas não-críticas (e-mails, notificações) ou
   eliminar totalmente? (Assumido: fora do caminho crítico; periférico = opcional/posterior.)
3. ✅ **RESOLVIDO (2026-06-24): Canal de cobrança/renovação = e-mail + WhatsApp.** E-mail (Resend)
   para registro formal + WhatsApp para conversão (exige integração WhatsApp). (Impacta 3.13.)
4. ✅ **RESOLVIDO (2026-06-24): Carência de inadimplência = 7 dias / 3 tentativas.** Re-tenta a
   cobrança em D+1, D+3, D+7; suspende o acesso no 7º dia sem pagamento. (Impacta 3.14.)
5. ✅ **RESOLVIDO (2026-06-24): Multi-produto = "1 por vez + autoatendimento logado".** Carrinho
   público (3.8) **deferido** como evolução futura; multi-produto entregue via "Contratar novo
   produto" logado (3.9).
6. **Mesmo plano duas vezes:** um cliente pode ter 2 assinaturas ATIVAS do mesmo plano (ex.: 2
   endereços fiscais)? Se sim, o índice único parcial `(cliente_id, plano_id) WHERE status='ativo'`
   da Story 3.1 precisa de outra chave.
7. **Modelo de faturamento no gateway:** cliente com N assinaturas = **1 customer InfinitePay com N
   cobranças** ou **N independentes**? Decide se o `handle`/customer fica no cliente ou por assinatura.
8. **Granularidade do contrato:** cada assinatura tem **seu próprio** contrato ZapSign + pagamento,
   ou produtos comprados juntos compartilham 1 assinatura/1 pagamento? (Afeta onde ficam os campos
   `zapsign_*`.)
9. **Exportar assets do n8n:** conseguimos os workflows n8n exportados + template ZapSign + templates
   de e-mail + URLs de redirect? (Bloqueia a Fase 1 — ver Riscos.)

## Restrições

- Strings de UI e termos de domínio em **pt-BR**; nomes de campos/DB em pt-BR (`cliente_planos`,
  `proximo_vencimento`, `razao_social`…).
- Brand tokens: `on-lime #60FF00`, `on-dark #232323`, `on-black #000000`; Outfit (títulos) +
  Work Sans (corpo) — design system dark premium do Epic 002.
- **Skill `ui-ux-pro-max` obrigatória** antes de qualquer story de UI (3.7, 3.8, 3.9, 3.10, 3.14).
- Edge Functions: deploy via Supabase CLI; `verify_jwt=false` apenas onde necessário (webhooks).
  Segredos (InfinitePay handle/token, ZapSign) via Supabase secrets — nunca hardcoded.
- Gates por story: `npm run lint`, `npx tsc --noEmit`, `npm run build`. Webhooks testados em staging.
- `git push` / PR / deploy: exclusivo **@devops**, somente sob ordem do usuário.

## Critérios de sucesso do épico

1. Um cliente pode ter **N assinaturas ativas** (produtos distintos), criadas pelo funil/
   autoatendimento, refletidas no dashboard do cliente e no admin.
2. O fluxo venda → contrato → assinatura → pagamento → login funciona **100% in-house** (n8n fora
   do caminho crítico), com cobrança via **InfinitePay**.
3. O sistema **calcula o período automaticamente**, **avisa o que vai vencer**, lista **quem
   cobrar** e exibe **MRR/ARR reais** (sem preços hardcoded, sem simulação, sem Mercado Pago).
4. Renovações são **geradas e disparadas automaticamente** por job agendado; pagamento confirmado
   via webhook avança o vencimento; inadimplência suspende após carência.
5. Nenhum cliente vivo é quebrado pela migração (backfill validado; rollback disponível).
