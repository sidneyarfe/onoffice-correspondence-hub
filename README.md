# ON Office — Correspondence Hub

SaaS de escritório virtual / endereço fiscal para empresas brasileiras. Clientes contratam
um plano, assinam contrato e pagam; a equipe ON Office gerencia correspondências,
documentos, financeiro e notificações de cada cliente.

## Stack

- **Frontend:** Vite + React 18 + TypeScript, React Router v6, TanStack Query
- **UI:** Tailwind CSS + shadcn/ui (Radix), fonte Work Sans, brand tokens `on-lime` /
  `on-dark` / `on-black`
- **Backend:** Supabase (Postgres + Auth + Edge Functions em Deno)
- **Forms:** react-hook-form + zod

## Desenvolvimento local

Pré-requisitos: Node.js 18+ e npm.

```sh
npm i              # instalar dependências
npm run dev        # dev server em http://localhost:8080
npm run build      # build de produção
npm run build:dev  # build em modo development
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run preview    # servir o build de produção localmente
```

Não há test runner configurado.

## Variáveis de ambiente

Copie `.env.example` para `.env`. O client Supabase lê:

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key (pública por design; RLS protege os dados) |
| `VITE_SUPABASE_PROJECT_ID` | Ref do projeto (usado pela CLI/scripts) |

Sem `.env`, o app usa fallback para o projeto padrão (produção atual).

## Supabase (banco, auth, functions)

Guia completo em [`docs/guides/supabase-cli.md`](docs/guides/supabase-cli.md). Resumo:

```sh
supabase login            # com a conta PROPRIETÁRIA do projeto
npm run db:link           # vincula ao projeto remoto
npm run db:types          # regenera src/integrations/supabase/types.ts
npm run db:push           # aplica migrations de supabase/migrations
npm run functions:deploy  # deploya as Edge Functions de supabase/functions
```

`src/integrations/supabase/types.ts` é **gerado** — nunca edite à mão.

## Estrutura

```
src/
├── pages/            # rotas públicas + dashboards (client/ e admin/)
├── components/       # client/, admin/, signup/, ui/ (shadcn)
├── hooks/            # camada de dados (use*.ts) — componentes não chamam supabase direto
├── contexts/         # AuthContext (sessão + papel client/admin)
├── integrations/     # supabase client + types gerados
├── utils/            # validators, formatters, adminEmails, authCleanup
└── lib/              # api.ts (endpoints de Edge Functions)
supabase/
├── functions/        # Edge Functions (Deno)
├── migrations/       # migrations SQL
└── config.toml       # project_id + verify_jwt por function
docs/
└── stories/          # epics e stories (método AIOX)
```

## Deploy

O build (`npm run build`) gera `dist/` estático — hospede em qualquer provedor (Vercel,
Netlify, Cloudflare Pages, S3+CDN). Configure as variáveis `VITE_SUPABASE_*` no ambiente
de build. Edge Functions são deployadas separadamente via Supabase CLI.

## Histórico

Projeto originalmente gerado via Lovable; desde 2026-06 é desenvolvido de forma totalmente
independente (epic 001 — `docs/stories/`).
