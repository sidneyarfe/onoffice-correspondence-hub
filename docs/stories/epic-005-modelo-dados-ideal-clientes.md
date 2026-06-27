# Epic 005 — Modelo de Dados Ideal + Reorganização de Clientes (Identidade · Catálogo · Comércio · Cobrança · Contrato)

**Status:** Draft (planejado — aguardando *draft* das stories por @sm)
**Owner:** @pm (Morgan) · Orquestração inicial: @aiox-master (Orion)
**Criado em:** 2026-06-26
**Projeto:** ON Office — Correspondence Hub (SaaS de escritório virtual / endereço fiscal)
**Predecessor direto:** Epic 003 (Motor de Receita Recorrente) — este épico é o **aprofundamento estrutural** que o 003 adiou.

## Decisões do usuário (fundadoras deste épico)

1. **Separar 5 preocupações que hoje vivem amontoadas em duas tabelas.** O modelo-alvo, já
   desenhado **com** o usuário, isola: **Identidade** (quem é o cliente), **Catálogo** (o que
   vendemos), **Comércio** (o que o cliente comprou), **Cobrança** (quem deve) e **Contrato**
   (o que foi assinado). Cobrança e Contrato são **transversais** — atravessam assinaturas e
   pedidos avulsos.
2. **Endereço fiscal é um recurso ATRIBUÍDO, não o endereço do cliente.** Hoje
   `contratacoes_clientes` guarda *o* endereço como se fosse do cliente. No alvo, o cliente tem
   o **seu próprio** endereço (cadastro) e os **endereços fiscais virtuais** viram um **pool**
   que a ON Office **atribui** a quem contrata o serviço de endereço.
3. **"Vencido" é estado da FATURA, não da assinatura** (modelo Stripe `past_due`). Uma
   assinatura fica "em atraso" *porque tem uma fatura vencida* — derivado na leitura **e**
   persistido por um job diário **no nível da fatura**.
4. **Renomear "recorrente" → "assinaturas" em todo lugar (inclusive no banco)** e registrar
   **avulsos** (ex.: horas de sala) como produtos com `tipo`, comprados via **pedidos**, sem
   exigir plano de endereço fiscal.
5. **Contrato automático real via ZapSign** — gerar do template do plano, autopreencher com os
   dados do cliente e enviar por e-mail para assinatura, a partir de um **modal no estilo do
   modal de Cobrança**. `ZAPSIGN_API_TOKEN` + templates já existem → implementar **de verdade**.

> Estas decisões **formalizam** um modelo já acordado. O papel deste épico é *documentar e
> sequenciar a migração*, não redesenhar o modelo.

## Objetivo / Visão

Levar a ON Office do modelo **"uma contratação = um plano por cliente"** (single-plan,
codificado em `contratacoes_clientes`) para o **modelo de domínio ideal** de um SaaS de receita
recorrente: um **cliente** (identidade) compra **N assinaturas** e **N pedidos avulsos**
(comércio) de um **catálogo** (produtos/planos), gerando **faturas** (cobrança, fonte da verdade
de "quem deve") e **contratos** (assinatura digital) — com **endereços fiscais** atribuídos como
recurso, não embutidos no cadastro.

Em paralelo, entregar a **reorganização da página de Clientes do admin**: edição inline do
cadastro com foto na própria ficha (aposentando a página "Perfil do cliente"), um **dashboard de
inadimplência** (vencidos / a cobrar) e o **envio de contrato em 1 clique**.

Este é o **substrato de dados** sobre o qual o Motor de Receita do Epic 003 (geração automática
de renovação, conciliação, inadimplência/suspensão) passa a rodar de forma limpa — ele entrega
as fundações (`assinaturas`, `faturas`, `contratos`) que o 003 deixou pela metade.

## Contexto & Problema (varredura brownfield — 2026-06-26)

### O legado single-plan (o que dói hoje)

- **`contratacoes_clientes` mistura pessoa + endereço fiscal + assinatura única.** Além dos dados
  do cliente, carrega campos single-plan (`plano_id`, `plano_selecionado`, `produto_id`, `preco`,
  `proximo_vencimento`, `metodo_pagamento`), o endereço fiscal contratado **como se fosse o
  endereço do cliente**, e o vocabulário de status maiúsculo (`status_contratacao`: `INICIADO →
  CONTRATO_ENVIADO → CONTRATO_ASSINADO → PAGAMENTO_PENDENTE → PAGAMENTO_CONFIRMADO → ATIVO →
  SUSPENSO/CANCELADO`). A migração `20260626120000` ainda **adicionou** `avatar_url` e
  `contrato_assinado_url` à mesma tabela. → A entidade está sobrecarregada de papéis.
- **A UI admin reformulada lê o legado single-plan, não o modelo de assinaturas.** Os componentes
  em `src/components/admin/clientes/` (`ClienteFicha`, `ClientesList`, `ClientesKanban`,
  `CobrancaModal`, `RegistrarContratoModal`, `EditarClienteModal`, `ClientePerfil`) consomem
  `useAdminClients`, que **lê os campos single-plan** de `contratacoes_clientes` e **não toca
  `cliente_planos`**. A aba "Plano & Financeiro" da ficha mostra **um** plano (`client.plan`,
  `client.preco`). `useClienteFicha` carrega `pagamentos`/`correspondencias`/`documentos`/
  `atividades`, mas não assinaturas.
- **`pagamentos` é raso e ambíguo.** Aponta para `contratacao_id` (UUID **sem FK**), `valor` em
  **REAIS** (não centavos), e não distingue "fatura" (o que se deve) de "tentativa de pagamento".
  Não há `status` canônico de fatura (`aberta|paga|vencida|cancelada`) nem `origem`
  (assinatura × pedido). O `CobrancaModal` insere em `pagamentos` com `status: 'pendente'` e
  espelha `metodo_pagamento`/`proximo_vencimento` em `contratacoes_clientes` — **a cobrança via
  InfinitePay é um stub** (aviso explícito no modal: *"integração futura — ainda não está ativa"*).
- **Catálogo não distingue assinatura de avulso.** `produtos` tem só `nome_produto`, `descricao`,
  `ativo` — **sem `tipo`**. `planos` tem `periodicidade` (nullable), `preco_em_centavos`,
  `zapsign_template_id_pf/pj` — mas nada que diga "isto é cobrado por hora", impossibilitando
  cadastrar **horas de sala** como produto vendável.
- **Contrato e cobrança estão diluídos na linha da assinatura.** Os campos `zapsign_*` e
  `infinitepay_*` vivem hoje em `cliente_planos` (e antes, em `contratacoes_clientes`) — não há
  entidade `contratos` nem `faturas` própria; "quem deve" e "o que foi assinado" não têm tabela
  de primeira classe.
- **Endereço fiscal é acoplamento, não recurso.** Comprar um avulso (hora de sala) hoje implicaria
  preencher um endereço fiscal que não existe para aquela venda. Não há tabela de **pool** de
  endereços fiscais nem o conceito de **atribuição**.

### O que o Epic 003 já entregou (fundação a reaproveitar)

- **`cliente_planos` é a proto-assinatura.** Migração `20260616120000_epic003_story31_…` criou a
  junção cliente↔plano multi-assinatura, com `status` cujo CHECK **já inclui `vencido`**
  (`aguardando_assinatura|aguardando_pagamento|ativo|vencido|suspenso|cancelado`),
  `proximo_vencimento` (trigger `trg_cliente_planos_set_vencimento` + RPC
  `calcular_vencimento_por_periodicidade`), `preco_snapshot_centavos` (histórico de preço imune a
  edição do catálogo), `produto_id` denormalizado, e os campos `zapsign_*`/`infinitepay_*`/
  pagamento **por assinatura**. Backfill feito por `20260616143000`. **Decisão 003 #6:** mesmo
  plano 2× é permitido (sem índice único parcial). Confirmado em `types.ts:180`.
- **`planos.zapsign_template_id_pf/pj`** já existem como colunas (hoje subutilizadas) — o lookup
  de template por `plano_id` substitui a derivação por string `plano_selecionado` do n8n.
- **Back-half do funil in-house** (code-complete, gated por deploy): `processar-contratacao`,
  `zapsign-webhook`, `infinitepay-webhook`, `_shared/infinitepay.ts`,
  `create-user-from-contratacao`. Lógica do n8n extraída para
  `docs/architecture/n8n-sistema-on-reference.md` (template IDs por plano×tipo, `dataVars` do
  contrato, e-mails Resend, URLs de redirect) — **ouro para a Story 5.5**.

### O que o Epic 003 deixou em aberto e este épico absorve

O 003 explicitamente **não** criou `assinaturas`/`faturas`/`contratos` (decisão "evoluir
`cliente_planos`, não criar tabela nova"). As stories tardias do 003 (3.10–3.14, ainda **Draft**)
dependiam desse refactor estrutural que não aconteceu. **Epic 005 é esse refactor.** A
reconciliação formal está na seção [Relação com o Epic 003](#relação-com-o-epic-003-reconciliação).

## Arquitetura-alvo (modelo ideal — 5 preocupações separadas)

```
┌─ IDENTIDADE ────────────────┐        ┌─ CATÁLOGO ──────────────────────────┐
│ clientes                    │        │ produtos (família)                  │
│  (rename de                 │        │  + tipo: assinatura | avulso        │
│   contratacoes_clientes)    │        │   └─> planos (price book)           │
│  pessoa PF/PJ, contato,     │        │        + tipo (herdado/explícito)   │
│  documento, avatar_url,     │        │        periodicidade (só assinatura)│
│  ENDEREÇO PRÓPRIO do cliente│        │        unidade  (só avulso, ex hora)│
└──────────┬──────────────────┘        │        preco_em_centavos            │
           │                           │        zapsign_template_id_pf/pj    │
           │ 1                         └──────────────┬──────────────────────┘
           │                                          │
     ┌─────┴──────────────── COMÉRCIO ────────────────┴───────────┐
     │  N                                              N           │
┌────▼─────────────────────┐                  ┌────────▼──────────────────┐
│ assinaturas              │                  │ pedidos + pedido_itens     │
│  (evolução de            │                  │  (avulsos: horas de sala,  │
│   cliente_planos)        │                  │   quantidade × unidade)    │
│  cliente_id, plano_id,   │                  │  cliente_id, plano_id,     │
│  produto_id, status,     │                  │  quantidade, unidade,      │
│  proximo_vencimento,     │                  │  preco_snapshot_centavos   │
│  preco_snapshot_centavos │                  └────────┬──────────────────┘
│  endereco_fiscal_id? ────┼──┐                        │
└────────┬─────────────────┘  │                        │
         │                    │ atribui                │
         │ origem             │                        │ origem
    ┌────▼──────── COBRANÇA (transversal) ─────────────▼────┐
    │ faturas  (evolução de pagamentos = fonte da verdade   │
    │           de "quem deve")                             │
    │  cliente_id, origem(assinatura_id | pedido_id),       │
    │  valor_centavos, status(aberta|paga|vencida|cancelada)│
    │  vencimento, paga_em, infinitepay_*                   │
    │   └─> pagamentos (tentativas/transações) [opcional]   │
    └───────────────────────────────────────────────────────┘

    ┌──────────── CONTRATO (transversal) ──────────────────┐
    │ contratos  (extrai zapsign_* de cliente_planos)      │
    │  cliente_id, assinatura_id?, zapsign_token,          │
    │  signing_url, status(enviado|assinado), template,    │
    │  pdf_url, assinado_em                                 │
    └──────────────────────────────────────────────────────┘

    ┌──────────── DOMÍNIO / FULFILLMENT ───────────────────┐
    │ enderecos_fiscais (pool de endereços virtuais que    │
    │   ATRIBUÍMOS — não são o endereço do cliente)        │
    │ correspondencias · documentos · notificacoes ·       │
    │   atividades  → referenciam o cliente                │
    └──────────────────────────────────────────────────────┘
```

**Princípios do alvo:**
- **Identidade ≠ recurso.** O endereço do cliente fica em `clientes`; o endereço fiscal vendido
  fica em `enderecos_fiscais` e é *atribuído* à assinatura (`endereco_fiscal_id`).
- **Comércio bifurca por `tipo`.** `assinatura` → `assinaturas` (recorrente, periodicidade);
  `avulso` → `pedidos`/`pedido_itens` (quantidade × unidade, ex. horas de sala).
- **Cobrança é transversal e é a fonte da verdade.** Toda dívida — venha de assinatura ou de
  pedido — vira `fatura`. **"Vencido" mora aqui**, não na assinatura.
- **Contrato é transversal.** Uma entidade `contratos` própria, com seu ciclo (enviado→assinado),
  reutilizável por assinatura e (futuramente) por pedido.

## Escopo

### Dentro (in)

- Edição inline do cadastro + upload de foto **na ficha**; remoção da página "Perfil do cliente".
- `tipo` em `produtos`/`planos` + UI de cadastro de produtos/planos + cadastro de **avulsos**.
- Evolução `pagamentos → faturas` (status/origem/vencimento/centavos) + **job diário** que marca
  vencidas no nível da fatura + derivação na leitura + **backfill**.
- **Dashboard de vencidos / a cobrar** (ordenado por dias em atraso + valor).
- Evolução `cliente_planos → assinaturas` (rename) + `pedidos`/`pedido_itens` + **multi-produto
  por cliente** + aba Financeiro da ficha listando assinaturas **e** avulsos.
- Entidade `contratos` (extrai `zapsign_*`) + edge fn **`enviar-contrato`** real (ZapSign) +
  modal "Enviar contrato" estilo Cobrança.
- Rename `contratacoes_clientes → clientes` (ALTER + VIEW de compat) + `enderecos_fiscais` (pool)
  + desacoplamento do endereço fiscal.

### Fora (out — explicitamente diferido)

- **Geração automática de cobrança de renovação** (Epic 003 Story 3.13) — depende deste substrato;
  roda depois, sobre `assinaturas`/`faturas`.
- **Conciliação automática + suspensão pós-carência** (Epic 003 Story 3.14) — idem; aqui entregamos
  apenas a *derivação/persistência de "vencido"*, não a automação de dunning/suspensão.
- **Funil público multi-produto / carrinho** (Epic 003 Story 3.8, já deferida).
- **Contrato por pedido avulso** (a entidade `contratos` é desenhada para suportar, mas o
  disparo a partir de pedido fica como evolução).
- **Migração de provedor de pagamento/assinatura** — InfinitePay + ZapSign permanecem.
- Limpeza/`DROP` físico das colunas legadas single-plan (só após todos os consumidores migrarem —
  story de limpeza futura, fora do escopo de risco deste épico).

## Stories (5.0 → 5.6)

| ID | Fase / Story | Tipo | Agente dono | Depende de | Risco |
|----|--------------|------|-------------|------------|-------|
| 5.0 | **Cadastro inline + foto na ficha**; remover "Perfil do cliente" (aposenta `ClientePerfil` e torna `EditarClienteModal` redundante) | UI | @ux-design-expert + @dev | — | Baixo · ✅ **Done** |
| 5.1 | **Catálogo:** `tipo` (`assinatura`/`avulso`) + `unidade` em `produtos`/`planos`; `ProductFormModal`/`PlanFormModal`; cadastrar avulsos (ex. hora de sala) | DB + UI | @data-engineer + @dev | — | Baixo-Médio · ✅ **Done** |
| 5.2 | **Cobrança:** evoluir `pagamentos → faturas` (status/origem/vencimento/centavos) + **job diário** marca vencidas + derivação na leitura + backfill | DB + Backend | @data-engineer + @dev | 5.1 | Médio-Alto · ✅ **Done** (view+fn em prod; agendamento pendente de `pg_cron`) |
| 5.3 | **Dashboard de vencidos / a cobrar** (lê faturas vencidas; ordena por dias em atraso + valor) na visão geral do admin | UI | @ux-design-expert + @dev | 5.2 | Baixo-Médio · ✅ **Done** (deriva na leitura) |
| 5.4 | **Comércio:** rename `cliente_planos → assinaturas` (ALTER + VIEW compat); `pedidos`/`pedido_itens` p/ avulsos; multi-produto por cliente; aba Financeiro lista assinaturas + avulsos | DB + UI | @data-engineer + @dev | 5.1, 5.2 | Alto · ✅ **Done** |
| 5.5 | **Contratos:** extrair `zapsign_*` → `contratos`; edge fn **`enviar-contrato`** (cria doc do template, autopreenche, envia e-mail); modal "Enviar contrato" estilo Cobrança; reusa `zapsign-webhook` | DB + Backend + UI | @dev + @ux-design-expert | 5.4 | Médio-Alto |
| 5.6 | **Identidade:** rename `contratacoes_clientes → clientes` (ALTER + VIEW compat); `enderecos_fiscais` (pool) + desacoplar endereço fiscal (`endereco_fiscal_id` na assinatura) | DB | @data-engineer + @dev | 5.4 | **Muito Alto** |

### Detalhamento por story

#### 5.0 — Cadastro inline + foto na ficha (demanda nº 1) — *ship first*

- **Objetivo:** transformar a aba **Cadastro** da `ClienteFicha` em editável **inline** (dados
  pessoais/empresa, contato, endereço próprio) com **upload de foto** no próprio fluxo; **remover**
  o botão e a página "Perfil do cliente" (`ClientePerfil`), tornando `EditarClienteModal` redundante.
- **Agente dono:** @ux-design-expert (Uma) + @dev (Dex). **Sem schema** — reusa `avatar_url` e o
  bucket `avatars` (migração `20260626120000`, já criada).
- **Esboço de AC:**
  - DADO um admin na ficha, QUANDO clica em "Editar" na aba Cadastro, ENTÃO os campos viram
    editáveis inline (sem modal) e salvam em `contratacoes_clientes`.
  - DADO a aba Cadastro, QUANDO o admin envia uma foto, ENTÃO ela sobe ao bucket `avatars` e
    `avatar_url` é atualizado; a foto aparece no `ClientAvatar` da ficha e da lista.
  - DADO a ficha, ENTÃO o botão "Perfil do cliente" e o componente `ClientePerfil` não existem
    mais; rotas/imports removidos; `EditarClienteModal` removido ou neutralizado.
  - `npm run lint` + `npx tsc --noEmit` + `npm run build` verdes.
- **Risco:** Baixo. UI only, aditivo de comportamento. Cuidado com referências órfãs a
  `ClientePerfil`/`EditarClienteModal` (`onPerfil`/`onEdit` em `ClienteFicha`).
- **Passo 0 (UI):** rodar a skill `ui-ux-pro-max` antes de codar (inline-edit, upload, form patterns).

#### 5.1 — Catálogo: `tipo` + avulsos (demanda nº 4, parte catálogo)

- **Objetivo:** dar ao catálogo o conceito de **assinatura vs avulso**. Adicionar `tipo` em
  `produtos` (e/ou `planos`) e `unidade` (ex. `hora`) para avulsos; `periodicidade` continua só
  para assinatura. UI de cadastro/edição de produtos e planos (`ProductFormModal`/`PlanFormModal`)
  passando a setar `tipo`/`unidade`. Cadastrar **horas de sala** como produto avulso.
- **Agente dono:** @data-engineer (Dara — DDL aditiva) + @dev (Dex — UI).
- **Esboço de AC:**
  - Migração **aditiva idempotente** adiciona `tipo text` (CHECK `assinatura|avulso`,
    default `assinatura` p/ não quebrar o catálogo vivo) e `unidade text` (nullable).
  - QUANDO `tipo='avulso'`, ENTÃO `unidade` é obrigatória na UI e `periodicidade` é oculta;
    QUANDO `tipo='assinatura'`, ENTÃO `periodicidade` é obrigatória e `unidade` oculta.
  - É possível cadastrar "Hora de sala de reunião" como produto/plano avulso com `unidade='hora'`
    e preço por unidade.
  - `useProducts` expõe `tipo`/`unidade`; gates verdes.
- **Risco:** Baixo-Médio. Decisão de modelagem: `tipo` no `produto` (família) e/ou no `plano`
  (price book)? Ver [Decisões em aberto](#decisões-em-aberto).
- **Passo 0 (UI):** skill `ui-ux-pro-max` antes dos modais de catálogo.

#### 5.2 — Cobrança: `faturas` + job diário de vencimento (demanda nº 2, fundação)

- **Objetivo:** elevar `pagamentos` à entidade **`faturas`** (fonte da verdade de "quem deve"):
  `status` canônico (`aberta|paga|vencida|cancelada`), `origem` (`assinatura_id` **xor**
  `pedido_id`), `vencimento`, `valor_centavos`, `paga_em`, refs InfinitePay. **"Vencido" derivado
  na leitura** + **job diário** (pg_cron **ou** Scheduled Edge Function) que **persiste** a
  transição `aberta→vencida` quando `vencimento < hoje`. Backfill a partir de `pagamentos`.
- **Agente dono:** @data-engineer (Dara) + @dev (Dex — job/edge fn).
- **Esboço de AC:**
  - Migração aditiva cria a estrutura de `faturas` (ou evolui `pagamentos` — ver decisão) com os
    campos acima; `valor` padronizado em **centavos** (hoje `pagamentos.valor` é em reais).
  - Uma fatura `aberta` com `vencimento < CURRENT_DATE` é exibida como **vencida** na leitura
    (derivação), mesmo antes do job rodar.
  - Um **job diário idempotente** marca como `vencida` toda fatura `aberta` vencida e é
    reexecutável sem efeito colateral.
  - Backfill cria faturas a partir do histórico de `pagamentos` sem duplicar (reexecutável).
  - Webhook InfinitePay (quando ativo) concilia `aberta→paga` + `paga_em` de forma idempotente
    (dedupe por `order_nsu`/`slug`).
- **Risco:** Médio-Alto. Toca dados financeiros vivos; `pagamentos` não tem FK p/ contratação e
  usa reais. Backfill incorreto gera dívida fantasma — validar amostra. **Aplicar em PROD é gate
  de deploy.**

#### 5.3 — Dashboard de vencidos / a cobrar (demanda nº 2, visão)

- **Objetivo:** seção no `AdminOverview` que lista clientes **com fatura vencida** e clientes
  **"a cobrar"** (fatura aberta a vencer), **organizados por dias em atraso + valor**. Lê de
  `faturas` (5.2). Atalho para o modal de cobrança / ficha do cliente.
- **Agente dono:** @ux-design-expert (Uma) + @dev (Dex).
- **Esboço de AC:**
  - DADO faturas vencidas, ENTÃO o dashboard lista cliente + dias em atraso + valor, ordenável
    por dias e por valor.
  - "A cobrar" agrupa faturas abertas com vencimento próximo (janela configurável, ex. 7 dias).
  - Clique leva à ficha/`CobrancaModal` do cliente.
  - Performance: agregação no banco (view/RPC), não no cliente.
- **Risco:** Baixo-Médio (depende inteiramente de 5.2). **Reconcilia/absorve** parte do Epic 003
  3.12 (radar de vencimento) e 3.14 (painel de atraso).
- **Passo 0 (UI):** skill `ui-ux-pro-max` (dashboard, tabela densa, ordenação, severidade por cor).

#### 5.4 — Comércio: `assinaturas` + `pedidos`/`pedido_itens` + multi-produto (demandas nº 4 e 5)

- **Objetivo:** **renomear `cliente_planos → assinaturas`** (ALTER TABLE RENAME + **VIEW de
  compat** com o nome antigo) e introduzir `pedidos`/`pedido_itens` para avulsos
  (quantidade × unidade). Ligar a UI admin ao modelo de **N assinaturas + N avulsos por cliente**:
  a aba "Plano & Financeiro" da ficha passa a listar **todas** as assinaturas e os avulsos, não
  um único `client.plan`.
- **Agente dono:** @data-engineer (Dara — DDL/rename/backfill) + @dev (Dex — hooks/UI).
- **Esboço de AC:**
  - `assinaturas` existe como rename de `cliente_planos`; **VIEW `cliente_planos`** preserva
    leitura/escrita legada durante a transição; `types.ts` regenerado.
  - `pedidos` + `pedido_itens` modelam compras avulsas (`cliente_id`, `plano_id` avulso,
    `quantidade`, `unidade`, `preco_snapshot_centavos`); cada pedido gera fatura (origem=pedido)
    via 5.2.
  - `useAdminClients`/`useClienteFicha` passam a ler assinaturas (corrige o `total_planos=1`
    hardcoded e as linhas órfãs na troca de plano apontadas no Epic 003 3.10).
  - A ficha lista assinaturas (status, próximo vencimento, valor) **e** avulsos; um cliente pode
    comprar avulso **sem** plano de endereço fiscal.
  - Gates verdes; nenhum cliente vivo perde dados (backfill validado).
- **Risco:** **Alto.** Rename de tabela ativa do Epic 003 + novas tabelas + reescrita de hooks de
  leitura. Mitigado por VIEW de compat e backfill idempotente. **Gate de deploy em PROD.**
- **Passo 0 (UI):** skill `ui-ux-pro-max` para a aba Financeiro multi-item.

#### 5.5 — Contratos: entidade `contratos` + `enviar-contrato` real (demanda nº 3)

- **Objetivo:** extrair os campos `zapsign_*` para uma entidade **`contratos`** própria
  (`cliente_id`, `assinatura_id?`, `zapsign_token`, `signing_url`, `status enviado|assinado`,
  `template`, `pdf_url`, `assinado_em`) e implementar **de verdade** o envio de contrato: edge fn
  **`enviar-contrato`** que cria o documento a partir do template do plano
  (`planos.zapsign_template_id_pf/pj`), **autopreenche** com os dados do cliente (os `dataVars`
  catalogados no n8n reference) e **envia por e-mail** para assinatura. Disparo por um **modal
  "Enviar contrato"** no estilo do `CobrancaModal`. Reusa `zapsign-webhook` (assinado → status).
- **Agente dono:** @dev (Dex — edge fn + integração) + @ux-design-expert (Uma — modal).
- **Esboço de AC:**
  - `contratos` existe; `zapsign_*` migram de `cliente_planos`/`assinaturas` com VIEW/colunas de
    compat durante a transição.
  - `enviar-contrato` chama `POST https://api.zapsign.com.br/api/v1/models/create-doc/` com
    `template_id` resolvido por `plano_id` × tipo de pessoa, `external_id`, `signer_*`,
    `send_automatic_email:true`, `redirect_link` e os `dataVars` autopreenchidos (PF e PJ).
    Lê o segredo **`ZAPSIGN_API_TOKEN`** (atenção: o deploy do Epic 004 registrou divergência —
    `ZAPSIGN_API_KEY` setado vs código lendo `ZAPSIGN_API_TOKEN`; reconciliar).
  - Modal "Enviar contrato" estilo `CobrancaModal` (header, corpo rolável, rodapé com CTA lime),
    com preview dos dados que serão autopreenchidos e seleção do template por plano.
  - `zapsign-webhook` marca `contratos.status='assinado'` + `assinado_em` de forma idempotente
    (dedupe por `document_token`).
  - Gates verdes; webhook testado em staging.
- **Risco:** Médio-Alto. Integração externa real + extração de campos. Idempotência do webhook.
  Segredo ZapSign divergente. **Deploy de edge fn = @devops.**
- **Passo 0 (UI):** skill `ui-ux-pro-max` para o modal "Enviar contrato".

#### 5.6 — Identidade: `clientes` + `enderecos_fiscais` (demandas nº 2 e 5, estrutural) — *last*

- **Objetivo:** renomear `contratacoes_clientes → clientes` (ALTER TABLE RENAME + **VIEW de
  compat**), afinando a entidade para **pessoa/conta**; criar o **pool `enderecos_fiscais`**
  (endereços virtuais que a ON Office atribui) e desacoplar o endereço fiscal do cadastro do
  cliente — a atribuição vira `endereco_fiscal_id` na assinatura (5.4). Migração **gradual** das
  referências (`pagamentos`/`faturas`, edge fns, hooks).
- **Agente dono:** @data-engineer (Dara) + @dev (Dex).
- **Esboço de AC:**
  - `clientes` existe; **VIEW `contratacoes_clientes`** preserva todos os consumidores legados
    (edge fns, `useAdminClients`, RLS, triggers) até migrarem; `types.ts` regenerado.
  - `enderecos_fiscais` (pool) modela os endereços virtuais; o endereço **próprio** do cliente
    permanece em `clientes`; a assinatura referencia `endereco_fiscal_id` quando aplicável.
  - Um cliente sem endereço fiscal (só avulsos) é válido.
  - Backfill move o endereço fiscal contratado para `enderecos_fiscais` + atribuição, sem perda.
  - Gates verdes; **nenhuma** quebra de RLS/edge fn (validar a matriz de consumidores antes).
- **Risco:** **Muito Alto** — maior raio de explosão do épico. `contratacoes_clientes` é referenciada
  por dezenas de arquivos, edge fns, RLS e a allowlist/`profiles`. VIEW de compat é obrigatória;
  cutover atrás de checagem. **Por isso é a última.** **Gate de deploy em PROD.**

## Dependências

```
5.0  ─ independente (ship first)
5.1  ─ independente
5.2  ─ depende de 5.1 (origem de fatura distingue assinatura/avulso/tipo)
5.3  ─ depende de 5.2 (lê faturas vencidas)
5.4  ─ depende de 5.1 + 5.2 (avulsos no catálogo + fatura por pedido)
5.5  ─ depende de 5.4 (assinatura_id estável para vincular contrato)
5.6  ─ depende de 5.4 (assinatura já é a âncora de endereco_fiscal_id)
```

5.0 e 5.1 podem correr **em paralelo** e antes de tudo. O caminho crítico estrutural é
**5.1 → 5.2 → 5.4 → 5.5/5.6**. 5.3 pendura em 5.2.

## Relação com o Epic 003 (reconciliação)

| Epic 003 (Draft) | Veredito em Epic 005 | Onde |
|------------------|----------------------|------|
| 3.10 — Admin exibe N assinaturas/cliente; corrige `total_planos=1` e linhas órfãs | **Absorvida** | 5.4 (+ 5.0) |
| 3.11 — Reconstruir `get-financial-overview` (MRR/ARR reais) | **Depende-de / rebaseada** | passa a ler `assinaturas`+`faturas` (5.2/5.4); o rebuild em si permanece no 003, agora sobre fonte de verdade real |
| 3.12 — Radar de vencimento (job + lista "quem cobrar") | **Absorvida** | 5.2 (job diário) + 5.3 (dashboard) |
| 3.13 — Geração automática de renovação (cria cobrança + link por ciclo) | **Depende-de (fora do escopo 005)** | roda **depois**, sobre `assinaturas`/`faturas`; permanece no 003 |
| 3.14 — Conciliação + inadimplência/suspensão pós-carência + painel | **Parcial** | 5.2 entrega a *derivação/persistência de "vencido"* (no nível da fatura) e 5.3 o painel de atraso; **suspensão automática pós-carência permanece no 003** |

**Resumo:** Epic 005 é o **aprofundamento estrutural** (`assinaturas`/`faturas`/`contratos`/
`clientes`/`enderecos_fiscais`) que o 003 adiou. Ele **absorve** as stories de *modelo de dados e
visualização* do 003 (3.10, 3.12, parte da 3.14) e **habilita** as stories de *automação*
(3.11, 3.13, resto da 3.14), que continuam no 003 e rodam **sobre** este substrato. Nada é
duplicado: o que é "estrutura/leitura" vem para cá; o que é "automação de receita" fica lá.

## Estratégia de migração (proteger clientes vivos)

Espelha o padrão validado no Epic 003 (migrações `2026061612…`/`2026061614…`):

- **Aditiva primeiro, sempre.** Novas colunas/tabelas com `IF NOT EXISTS`; nada é removido enquanto
  houver consumidor. Defaults seguros (ex. `produtos.tipo DEFAULT 'assinatura'`).
- **Idempotência obrigatória.** Toda migração reexecutável (`CREATE … IF NOT EXISTS`,
  `ON CONFLICT DO NOTHING`, `ADD COLUMN IF NOT EXISTS`).
- **VIEW de compatibilidade em todo rename.** `cliente_planos → assinaturas` (5.4) e
  `contratacoes_clientes → clientes` (5.6) **devem** deixar uma VIEW com o nome antigo (com
  regras `INSTEAD OF` se precisar de escrita) até todos os consumidores — edge fns, hooks, RLS,
  triggers — migrarem. **Sem big-bang.**
- **Backfill explícito e validado.** Stories de DB (5.2, 5.4, 5.6) incluem backfill **idempotente**
  com **validação por amostra** antes do cutover (faturas a partir de pagamentos; assinaturas já
  existem; endereço fiscal → pool).
- **Notas de ROLLBACK por migração.** Cada migração documenta o desfazimento (drop da view, reverter
  default, restaurar nome) — espelhando o estilo das migrações do 003.
- **Regenerar `types.ts` após cada rename** (`supabase gen types … > src/integrations/supabase/types.ts`)
  e rodar `npx tsc --noEmit` como gate antes de qualquer UI consumir o novo nome.
- **Aplicar migração em PROD é GATE DE DEPLOY** — mesma postura da rotação de chaves recente; só
  com ordem do usuário, executado por **@devops**. Validar em staging primeiro (especialmente
  webhooks e o job diário).

## Riscos & mitigação

| # | Risco | Severidade | Mitigação |
|---|-------|-----------|-----------|
| R1 | **Rename de alto raio** (`contratacoes_clientes`/`cliente_planos` referenciados por edge fns, RLS, triggers, allowlist, dezenas de arquivos) | Muito Alta | VIEW de compat obrigatória; migração gradual de consumidores; 5.6 por último; matriz de consumidores auditada antes do cutover |
| R2 | **Gate de PROD** — migração estrutural aplicada ao banco vivo | Alta | Staging primeiro; backfill validado por amostra; rollback documentado; aplicação por @devops sob ordem |
| R3 | **`faturas` × `pagamentos`** — `valor` em reais vs centavos, sem FK, "fatura" vs "tentativa" ambíguos | Alta | Padronizar centavos; definir cardinalidade fatura→tentativas; backfill com conversão validada |
| R4 | **ZapSign real (5.5)** — integração externa + idempotência + segredo divergente (`ZAPSIGN_API_KEY` vs `ZAPSIGN_API_TOKEN`) | Média-Alta | Reconciliar nome do segredo no deploy; dedupe por `document_token`; testar em staging; n8n reference como fonte dos `dataVars` |
| R5 | **Multi-produto** — `useAdminClients` deixa linhas órfãs na troca de plano e hardcoda `total_planos=1` | Média | 5.4 reescreve a leitura sobre `assinaturas`; testes manuais de troca/adição de produto |
| R6 | **Overlap com Epic 003** — risco de duplicar 3.10/3.12/3.14 | Média | Tabela de reconciliação explícita (acima); 005 = estrutura+leitura, 003 = automação |
| R7 | **Sem test runner** — QA é `npm run lint` + `npx tsc --noEmit` + `npm run build` + manual | Média | Gates por story; webhooks e job diário testados em staging; revisão manual de backfill |
| R8 | **Endereço fiscal desacoplado** — clientes que só têm plano de endereço podem regredir se a atribuição falhar | Média | Backfill 1:1 do endereço contratado → pool + atribuição; validar contagem antes/depois |

## Decisões resolvidas (fundadoras — 2026-06-26)

- **Modelo-alvo de 5 preocupações** (Identidade/Catálogo/Comércio/Cobrança/Contrato) — desenhado
  com o usuário; este épico **formaliza**, não redesenha.
- **"Vencido" no nível da FATURA**, derivado na leitura **e** persistido por job diário.
- **Avulsos** entram como produtos com `tipo` + `unidade`, comprados via `pedidos` (sem exigir
  endereço fiscal).
- **ZapSign permanece** o provedor; templates por plano já configurados; 5.5 implementa de verdade.
- **InfinitePay permanece** o gateway (herda do Epic 003).
- **Toda migração aditiva + idempotente + VIEW de compat**; rename físico, não só alias lógico
  (a confirmar a *forma* — ver abaixo).

## Decisões em aberto

> Estas precisam de confirmação do usuário **antes** das stories de DB de maior raio (5.2, 5.4, 5.6).
> Onde a story não puder esperar, o @sm registra `[AUTO-DECISION]` com o default proposto.

1. **Forma do rename (5.4/5.6):** `ALTER TABLE RENAME` físico + VIEW de compat com o nome antigo
   (alvo limpo, porém regenera `types.ts` e toca edge fns) **vs** manter o nome físico antigo e
   expor só uma VIEW com o nome novo (menor raio, porém o "ideal" fica só na camada lógica)?
   *Default proposto:* **rename físico + VIEW de compat** (o pedido é "renomear no banco").
2. **`faturas`: tabela nova vs evolução de `pagamentos`** — e qual a cardinalidade fatura↔tentativa.
   Opção A: renomear `pagamentos → faturas` e criar `pagamentos`(tentativas) como filha nova.
   Opção B: manter `pagamentos` como está (vira "fatura" conceitual) e adicionar tabela de
   tentativas à parte. Inclui padronizar **`valor` para centavos**. *Default proposto:* **A**
   (faturas como entidade de 1ª classe; tentativas opcionais filhas), com backfill convertendo reais→centavos.
3. **Fronteira 005 × 003 (automação):** confirmar que 005 **para** no substrato + derivação/
   persistência de "vencido" + dashboard, deixando **geração automática de renovação (3.13)** e
   **suspensão pós-carência (3.14)** para uma onda posterior do Epic 003 sobre este substrato.
   *Default proposto:* **sim** (evita duplicar automação enquanto a estrutura assenta).
4. **`tipo` no `produto` (família) e/ou no `plano` (price book)?** *Default proposto:* no
   **produto** (família define a natureza), herdado/derivável no plano. (Impacta 5.1.)
5. **Atribuição de endereço fiscal:** `endereco_fiscal_id` direto na `assinatura` (1 endereço por
   assinatura) vs tabela de atribuição N:N. *Default proposto:* **FK na assinatura** (1:1 cobre o
   caso atual; N:N é evolução). (Impacta 5.6.)

## Restrições

- Strings de UI e termos de domínio em **pt-BR**; nomes de campos/DB em pt-BR (`clientes`,
  `assinaturas`, `faturas`, `contratos`, `pedidos`, `enderecos_fiscais`, `proximo_vencimento`…).
- Brand tokens: `on-lime #60FF00`, `on-dark #232323`, `on-black #000000`; fonte `Work Sans`
  (`font-work-sans`). Reusar, nunca hardcodar hex. Modais reaproveitam o padrão visual do
  `CobrancaModal` (header + corpo rolável + rodapé com CTA lime).
- **Skill `ui-ux-pro-max` obrigatória (Passo 0) antes de codar** qualquer story de UI (5.0, 5.3,
  parte de 5.1/5.4/5.5) — regra inegociável do projeto.
- Edge Functions: deploy via Supabase CLI; `verify_jwt=false` só onde necessário (webhooks).
  Segredos via Supabase secrets — nunca hardcoded. Funções usam `SB_SECRET_KEY ?? SUPABASE_SERVICE_ROLE_KEY`.
- Gates por story: `npm run lint`, `npx tsc --noEmit`, `npm run build` + revisão manual.
  **Não há test runner** (`npm test` não existe). Webhooks e job diário testados em staging.
- **Migração em PROD = gate de deploy** (postura da rotação de chaves recente).
- `git push` / PR / deploy de Edge Functions e migrações: **exclusivo @devops**, só sob ordem do
  usuário. Recomenda-se uma **branch dedicada do épico** (ex. `feat/epic-005-modelo-dados-ideal`),
  partindo da atual `fix/edge-functions-secret-key` após o merge dela — decisão/execução @devops.

## Critérios de aceite do épico

1. O admin **edita o cadastro do cliente inline e troca a foto na própria ficha**; a página
   "Perfil do cliente" não existe mais.
2. O catálogo distingue **assinatura** de **avulso**; é possível cadastrar **horas de sala** como
   produto avulso e um cliente pode comprá-lo **sem** plano de endereço fiscal.
3. **"Quem deve" é a fonte da verdade `faturas`**: "vencido" é derivado na leitura e persistido
   por **job diário** no nível da fatura; o dashboard lista vencidos/a-cobrar por **dias em atraso
   + valor**.
4. Um cliente tem **N assinaturas + N avulsos**, refletidos na ficha (aba Financeiro) e no admin,
   sem linhas órfãs e sem `total_planos` hardcoded.
5. O admin **envia o contrato em 1 clique** via ZapSign (modal estilo Cobrança), gerado do
   template do plano, autopreenchido e enviado por e-mail; o webjook ZapSign marca `assinado`.
6. As entidades **`clientes`, `assinaturas`, `faturas`, `contratos`, `enderecos_fiscais`** existem
   no banco com **VIEWs de compat**; **nenhum cliente vivo é quebrado** (backfill validado,
   rollback disponível, `types.ts` regenerado, gates verdes).

## Sequenciamento recomendado

1. **5.0** (cadastro inline + foto) — *ship first*, valor imediato, risco baixo, sem schema.
2. **5.1** (catálogo `tipo`/avulsos) — em paralelo com 5.0; desbloqueia 5.2/5.4.
3. **5.2** (faturas + job diário) — fundação de cobrança; **gate de PROD**.
4. **5.3** (dashboard vencidos) — logo após 5.2; entrega visível de inadimplência.
5. **5.4** (assinaturas + pedidos + multi-produto) — núcleo do comércio; rename de alto risco com VIEW compat.
6. **5.5** (contratos + `enviar-contrato` real) — depende de 5.4; integração ZapSign real.
7. **5.6** (clientes + enderecos_fiscais) — **por último**, maior raio de explosão.

> Onda A (paralela, baixo risco): **5.0 + 5.1**. Onda B (cobrança): **5.2 → 5.3**.
> Onda C (estrutura pesada): **5.4 → 5.5 → 5.6**. Cada onda fecha com gates + (se tocar PROD) deploy @devops.

## Métricas de sucesso

- **0** clientes quebrados pela migração (contagem antes/depois por entidade = igual; backfill
  validado por amostra).
- **0** referências órfãs a `ClientePerfil`/`EditarClienteModal` após 5.0 (`tsc --noEmit` limpo).
- **100%** das faturas vencidas detectadas pelo job diário = faturas vencidas derivadas na leitura
  (consistência derivação × persistência).
- **N assinaturas + N avulsos** por cliente exibidos corretamente (fim do `total_planos=1`).
- Contrato enviado de ponta a ponta em staging: `enviar-contrato` → e-mail → assinatura →
  `zapsign-webhook` marca `assinado` (latência de webhook < 1 min, idempotente em reentrega).
- Todas as stories com gates verdes (`lint` + `tsc --noEmit` + `build`) e, quando aplicável,
  smoke test em staging do job diário e dos webhooks.

---

### Apêndice — mapa demanda → story

| Demanda do usuário | Story(ies) |
|--------------------|-----------|
| 1. Editar cadastro inline + foto na ficha; remover "Perfil do cliente" | **5.0** |
| 2. "Vencido" automático (derivar + job diário, nível fatura) + dashboard de vencidos/a-cobrar | **5.2** + **5.3** |
| 3. Enviar contrato automático via ZapSign (modal estilo Cobrança, template do plano, autopreenchido) | **5.5** |
| 4. Renomear recorrente → "assinaturas" (inclusive DB) + cadastrar avulsos (horas de sala) com `tipo` | **5.1** (catálogo) + **5.4** (rename) |
| 5. Multi-produto/assinatura por cliente; desacoplar do endereço fiscal | **5.4** (multi-produto) + **5.6** (desacoplar) |
