# Referência: workflow n8n "SISTEMA ON" (assets para o desacoplamento — Epic 003 Fase 1)

**Fonte:** `docs/zLlpsqMLo16TDBW6-SISTEMA_ON.json` (export do n8n, fornecido pelo usuário em
2026-06-16). Este documento **extrai a lógica oculta** que vivia só na nuvem do n8n e que era o
maior bloqueador prático da Fase 1 (ver Riscos do épico). Com isto, a pipeline in-house
(`processar-contratacao`, webhooks ZapSign/InfinitePay) pode ser reconstruída fielmente.

> ⚠️ **SEGREDO VAZADO — AÇÃO IMEDIATA.** O nó **`5B. Criar Cobrança Única (Pagar.me)`** contém um
> header `authorization: Basic c2tf…` **hardcoded** = uma **secret key da Pagar.me em produção**
> embutida no JSON (linha ~827). Como este arquivo foi commitado em `docs/`, a chave está exposta no
> histórico do git. **Rotacionar a chave Pagar.me agora** e considerar limpar o histórico. A Pagar.me
> sai de cena (vira InfinitePay), mas a chave **ainda é válida até ser revogada**. Mesma atenção às
> credenciais ZapSign/Resend/Mailchimp/Supabase service key referenciadas por nome no export.

---

## Visão geral — 5 sub-fluxos

| # | Sub-fluxo | Gatilho (webhook path) | Papel |
|---|-----------|------------------------|-------|
| 1 | **Iniciar Contratação** | `27403522-…` (form Lovable) | Salva contratação + gera contrato ZapSign |
| 2 | **Pagamento** | `d9df6184-…` (ZapSign assinado) | Cria cobrança + envia link de pagamento |
| 3 | **Credenciais 1º acesso** | `ec39e0b2-…` (Pagar.me pago) | Ativa cliente + provisiona usuário + boas-vindas |
| 4 | **Notificação de correspondência** | `3afdd4ab-…` | E-mail ao cliente de nova correspondência |
| 5 | **Criação manual (admin)** | `7dd7b139-…` | Variante do fluxo 1 disparada pelo admin |

Mapa para as stories do épico: Fluxo 1 → **3.4** (`processar-contratacao` in-house); Fluxo 2 →
**3.5** (webhook ZapSign) + **3.6** (link InfinitePay); Fluxo 3 → **3.6** (webhook pago + provisiona)
+ **3.7** (páginas de acompanhamento); Fluxo 4 → já coberto in-app (notificações), periférico;
Fluxo 5 → admin (3.10).

---

## Fluxo 1 — Iniciar Contratação

`Webhook(form) → 2. Salvar Dados no DB → 3. Preparar Dados p/ Contrato (code) → 4. Criar Contrato ZapSign → 6. Salvar Link e Atualizar Status`

- **2. Salvar Dados no DB:** insert em `contratacoes_clientes` com os campos do form
  (`plano_selecionado, tipo_pessoa, email, id, telefone, nome_responsavel, cpf_responsavel,
  razao_social, cnpj, endereco, numero_endereco, complemento_endereco, bairro, cidade, estado,
  cep, status_contratacao, created_at, plano_id, produto_id, produto_selecionado, preco`). O `id`
  é gerado **pelo cliente (browser)** e enviado no body. **Single-plan** (grava direto na
  contratação, nunca em `cliente_planos`).
- **4. Criar Contrato ZapSign:** `POST https://api.zapsign.com.br/api/v1/models/create-doc/`
  (auth header `Credencial ZapSign Final`). Body:
  ```json
  { "template_id": "<por plano×tipo>", "external_id": "<contratacao.id>",
    "signer_name": "<nome_responsavel>", "signer_email": "<email>",
    "send_automatic_email": true,
    "redirect_link": "https://clientes.onofficebelem.com.br/processando-pagamento?id=<contratacao.id>",
    "sandbox": false, "data": "<dataVars>" }
  ```
- **6. Salvar Link e Atualizar Status:** grava `zapsign_document_token` (= resp `.token`),
  `zapsign_signing_url` (= resp `.signers[0].sign_url`), `status_contratacao = 'CONTRATO_ENVIADO'`.

### ZapSign — Template IDs (por plano × tipo de pessoa)

A chave do plano é derivada de `plano_selecionado` (uppercase `includes`): `MENSAL` / `1 ANO` / `2 ANOS`.

| Plano | Pessoa Jurídica | Pessoa Física |
|-------|-----------------|---------------|
| MENSAL | `b93bf9ad-f2ad-4df3-bb62-77497f8f88ff` | `f6eb9976-f66f-47d7-8ddc-39666ea306f6` |
| 1 ANO | `64cda768-d413-48a2-84f9-e15df4590720` | `ded30f07-d15e-44f1-83ac-2b40ec39dcf3` |
| 2 ANOS | `93388498-5ad5-4e4d-b2b2-f7c935de4856` | `d331ff41-38cf-4bf8-9a59-ea8c535915b5` |

> Na Fase 1 estes IDs passam a viver em `planos.zapsign_template_id_pf` / `zapsign_template_id_pj`
> (já existem como colunas) — a derivação por string `plano_selecionado` é legado a substituir por
> lookup via `plano_id`.

### ZapSign — variáveis do contrato (`dataVars`, formato `{de, para}`)

`{{NOME_RESPONSAVEL}}`, `{{CPF_RESPONSAVEL}}`, `{{EMAIL_RESPONSAVEL}}`, `{{TELEFONE_RESPONSAVEL}}`,
`{{ENDERECO_LOGRADOURO}}`, `{{ENDERECO_NUMERO}}`, `{{ENDERECO_COMPLEMENTO}}`, `{{ENDERECO_BAIRRO}}`,
`{{ENDERECO_CIDADE}}`, `{{ENDERECO_ESTADO}}`, `{{ENDERECO_CEP}}`, `{{PLANO_NOME}}` (= `plano_selecionado`).
**Só PJ:** `{{RAZAO_SOCIAL}}`, `{{CNPJ}}`. (Código-fonte da montagem: nó `3. Preparar Dados para
Contrato`.)

---

## Fluxo 2 — Pagamento (ZapSign assinado → link de pagamento)

`Webhook(ZapSign) → 2. Atualiza Status e Pega Dados → (2.1 Buscar Detalhes do Plano) → 3. Plano é Mensal? → [mensal: 4A link MENSAL | anual/bianual: 5B Criar Cobrança Única] → 7. Salvar Link de Pagamento → 8. Enviar Link de Pagamento no Email`

- **Webhook ZapSign:** identifica a contratação por `body.external_id`; grava
  `zapsign_signed_at = body.signers[0].signed_at`, `status_contratacao = 'CONTRATO_ASSINADO'`.
- **Ramo MENSAL vs ANUAL/BIANUAL** decidido por `planos.periodicidade` contém `mensal`.
- **Gateways legados encontrados (todos a substituir por InfinitePay):**
  - Mensal: **Mercado Pago** *preapproval* (assinatura recorrente nativa) — link fixo hardcoded
    `…/subscriptions/checkout?preapproval_plan_id=2c9380849764e81a019769cafeab01f1` (nó `4A`).
  - Mensal alt.: **Pagar.me** `POST /core/v5/paymentlinks` `type:subscription` com
    `cart_settings.recurrences[].plan_id = planos.pagarme_plan_id` (nó `4A. Criar Assinatura Mensal`).
  - Anual/bianual: **Mercado Pago** `POST /checkout/preferences` (nó `5B`) **e** **Pagar.me**
    `POST /core/v5/paymentlinks` `type:order` com `amount = body.unit_amount_cents` (nó `5B Pagar.me`).
  - ⚠️ Credenciais rotuladas "Stripe" mas apontando para endpoints Mercado Pago/Pagar.me — **drift de
    gateway** confirmado (corrobora o épico).
- **7. Salvar Link de Pagamento:** grava `pagarme_payment_link = resp.url`,
  `pagarme_payment_id = resp.id`, `status_contratacao = 'PAGAMENTO_PENDENTE'`.
- **8. Enviar Link de Pagamento (Resend):** e-mail "Finalize o pagamento…" com CTA → `pagarme_payment_link`.

### Redirect / back URLs (a reproduzir na Fase 1, agora apontando InfinitePay)

| Evento | URL |
|--------|-----|
| Pós-assinatura (ZapSign `redirect_link`) | `https://clientes.onofficebelem.com.br/processando-pagamento?id=<id>` |
| Pagamento sucesso | `https://clientes.onofficebelem.com.br/sucesso` |
| Pagamento falha | `https://clientes.onofficebelem.com.br/falha-pagamento` |
| Pagamento pendente | `https://clientes.onofficebelem.com.br/pagamento-pendente` |

---

## Fluxo 3 — Credenciais do primeiro acesso (pagamento confirmado)

`Webhook(Pagar.me) → 2. Pagamento Aprovado? (status == 'paid') → 3. Ativar Cliente no DB → 4. Email de Pagamento Aprovado → 5. Verificar Contato no MC → 8A/8B upsert Mailchimp → 9. merge → 10. Adicionar tag → 11. Criar Usuário e Senha (edge fn) → 12. Boas-Vindas → 13. status ATIVO`

- **Aprovação:** `body.data.status == 'paid'`. Localiza a contratação por
  `email = body.data.customer.email` **e** `pagarme_payment_id = body.data.order.code`. Grava
  `status_contratacao = 'PAGAMENTO_CONFIRMADO'`, `pagarme_paid_at = now()`.
- **Provisionamento (reuso na Fase 1):**
  `POST https://ifpqrugbpzqpapoaameo.supabase.co/functions/v1/create-user-from-contratacao`
  com `{ "contratacao_id": <id> }` (auth custom = service key). Retorna `email` + `temporary_password`.
- **13. Status final:** `status_contratacao = 'ATIVO'` → habilita login do cliente.
- **Mailchimp:** lista `96972c64b8`; merge fields `FNAME`, `PHONE`; tag de ativação
  `"CLIENTE ATIVO - ENDFISCAL - SISTEMA"`. (Periférico — fora do caminho crítico.)

---

## Fluxo 4 — Notificação de correspondência

`Webhook → 2. Envio de email com RESEND`. E-mail "Nova Correspondência Recebida" via Resend, com
remetente/assunto/data e CTA → `/correspondencias`. Já há equivalente in-app (notificações);
manter periférico.

---

## Inventário de e-mails transacionais (a portar para a Fase 1)

Todos via **Resend** (`POST https://api.resend.com/emails`, remetente
`ON Office Belém <contato@onofficebelem.com.br>`), exceto onde indicado. HTML completo preservado no
JSON-fonte (referência por nó) — **brand:** Work Sans, CTA `#60FF00`/texto `#000000`, título `#232323`,
logo `…/lovable-uploads/097e40db-b932-4530-9a96-19802dc82d39.png`.

| E-mail | Nó (fonte) | Assunto | Variáveis / CTA |
|--------|-----------|---------|-----------------|
| Nova correspondência | `2. Envio de email com RESEND` | "Nova Correspondência Recebida" | `cliente_nome, remetente, assunto, data_recebimento, arquivo_url` → `/correspondencias` |
| Link de pagamento | `8. Enviar Link de Pagamento no Email` | "Finalize o pagamento do seu Endereço Fiscal" | `nome_responsavel`, CTA → `pagarme_payment_link` |
| Pagamento aprovado | `4. Email de Pagamento Aprovado` | "Pagamento aprovado — Endereço Fiscal" | resumo: plano, valor (`amount/100`), código, método |
| Boas-vindas (credenciais) | `12. Enviar E-mail de Boas-Vindas1` | "Seus dados de acesso ao Endereço Fiscal." | `email` (login), `temporary_password`, CTA → `/login` |
| Boas-vindas (variante Zoho/SMTP) | `12. Enviar E-mail de Boas-Vindas` | idem | duplicata via Zoho Mail — **consolidar em 1 provedor na Fase 1** |

> ⚠️ A variante Zoho tem logo placeholder `https://i.imgur.com/your-logo-url.png` e template parcial —
> usar a versão **Resend** como canônica.

---

## Vocabulário canônico de `contratacoes_clientes.status_contratacao` (confirmado pelo workflow)

```
(form) → CONTRATO_ENVIADO → CONTRATO_ASSINADO → PAGAMENTO_PENDENTE → PAGAMENTO_CONFIRMADO → ATIVO
```

Mapa para o `cliente_planos.status` (minúsculo, ampliado na Story 3.1):

| `status_contratacao` (legado, conta) | `cliente_planos.status` (assinatura) |
|--------------------------------------|--------------------------------------|
| CONTRATO_ENVIADO | `aguardando_assinatura` |
| CONTRATO_ASSINADO / PAGAMENTO_PENDENTE | `aguardando_pagamento` |
| PAGAMENTO_CONFIRMADO / ATIVO | `ativo` |
| (vencido por job) | `vencido` |
| (suspenso pós-carência) | `suspenso` |
| (cancelado) | `cancelado` |

---

## Credenciais/segredos referenciados (migrar para Supabase secrets — nunca hardcoded)

ZapSign (`Credencial ZapSign Final`), Resend (`Credencial Resend ON Office`), Mailchimp, Zoho SMTP,
Supabase service key (edge fn), e **Pagar.me Basic key hardcoded (ROTACIONAR)**. Na Fase 1, somente
**InfinitePay** (handle + token) e **ZapSign** permanecem no caminho crítico, via Supabase secrets.
