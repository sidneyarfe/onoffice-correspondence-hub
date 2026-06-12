# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ON Office — a virtual-office / fiscal-address SaaS for Brazilian businesses. Clients sign up,
choose a plan, sign a contract, and pay; the company (admin) then manages their incoming
correspondences (mail), documents, billing, and notifications. UI text and domain terms are
in **Portuguese (pt-BR)** — keep new user-facing strings and DB field names in Portuguese to
match the existing schema (`contratacoes_clientes`, `correspondencias`, `razao_social`, etc.).

Originally generated with Lovable (lovable.dev), the project is now **fully independent**
(epic 001): no `lovable-tagger`, no Lovable-hosted assets, Supabase managed directly via
CLI. Development follows the AIOX story-driven method (`docs/stories/`).

## 🎨 Design Governance (OBRIGATÓRIO)

**Toda demanda de design/UI/UX passa pela skill `ui-ux-pro-max` ANTES de escrever, revisar ou
aprovar código de interface** — vale para o Claude Code direto e, principalmente, para os
agentes do método AIOX (`@ux-design-expert`/Uma, `design-system`/Brad Frost, `design-chief`,
e `@dev` quando toca UI).

Passo 0, antes de codar:

```bash
python ".claude/skills/ui-ux-pro-max/scripts/search.py" "<produto> <indústria> <keywords>" --design-system -p "ON Office"
# focado: --domain <product|style|typography|color|landing|chart|ux>  |  --stack <react|shadcn|html-tailwind>
```

Aplique as paletas, fontes, estilos, diretrizes de UX e o checklist retornados; respeite o
stack (React + TS + Tailwind + shadcn) e os brand tokens (`on-lime #60FF00`, `on-dark #232323`,
`on-black #000000`, fonte `Work Sans`). Política completa:
`.claude/rules/ui-ux-pro-max-enforcement.md` e `.aiox-core/data/technical-preferences.md`
(§ Design Governance). Reforço automático via hook `UserPromptSubmit`
(`.claude/hooks/enforce-ui-ux-pro-max.cjs`). Exceção: tarefas puramente backend/infra/dados.

## Commands

```sh
npm i              # install
npm run dev        # Vite dev server on http://localhost:8080
npm run build      # production build
npm run build:dev  # build in development mode
npm run lint       # ESLint (flat config, eslint.config.js)
npm run preview    # preview a production build
```

There is **no test runner configured** — do not assume `npm test` works.

Supabase Edge Functions (Deno) live in `supabase/functions/`. Deploy with the Supabase CLI
(`supabase functions deploy <name>`). `supabase/config.toml` lists functions whose JWT
verification is disabled (`verify_jwt = false`) — admin/bootstrap functions that must run
unauthenticated.

## Architecture

**Stack:** Vite + React 18 + TypeScript, React Router v6, TanStack Query, Tailwind +
shadcn/ui (Radix), Supabase (Postgres + Auth + Edge Functions). Path alias `@/` → `src/`.

**Two-app split by role.** A single SPA serves two dashboards gated by `ProtectedRoute`
(`userType="client" | "admin"`):
- `/cliente/*` → `pages/client/ClientDashboard` (nested routes for correspondences, documents, financial, profile, notifications)
- `/admin/*` → `pages/admin/AdminDashboard` (clientes, produtos, correspondencias, documentos, financeiro, equipe, relatorios)

Each dashboard defines its own nested `<Routes>` plus a sidebar/header shell. Public routes
(landing, login, plan selection, signup, the multi-step payment flow) sit at the top level in
`src/App.tsx`.

**Auth & role resolution (`src/contexts/AuthContext.tsx`).** Supabase Auth session drives a
custom `AuthUser` with `type: 'client' | 'admin'`. Admin status is decided by an **email
allowlist** (`onoffice1893@gmail.com`, `contato@onofficebelem.com.br`,
`sidneyferreira12205@gmail.com`, anything `@onoffice.com`) OR `profiles.role === 'admin'`.
⚠️ This `isAdminEmail` allowlist is **duplicated** in several files (`AuthContext`,
`ProtectedRoute`, `useAdminData`, …) — if you change who counts as admin, update all copies.
Client extra data (plan, company) comes from the `contratacoes_clientes` table.

**Supabase access pattern.** The browser client (`src/integrations/supabase/client.ts`) uses
the **anon public key** and talks to RLS-protected tables directly. `src/integrations/supabase/types.ts`
is **generated** (`Database` type) — do not hand-edit; regenerate from the schema. Privileged
operations (creating auth users, syncing/resetting passwords, deleting admins, financial
aggregation) go through **Edge Functions** that use `SUPABASE_SERVICE_ROLE_KEY`.

**Data layer = custom hooks.** All DB access is wrapped in `src/hooks/use*.ts` (e.g.
`useAdminClients`, `useCorrespondencias`, `useContratacao`, `useClientPlanos`). Components
consume hooks; they generally don't call `supabase` directly. Note some hooks (e.g.
`useAdminData`) use raw `useState`/`useEffect` rather than TanStack Query, and include a
~500ms `setTimeout` to wait out the auth-context warmup — be aware of this timing quirk when
debugging "data not loading" issues.

**Onboarding / payment flow** is a state machine spread across pages: plan selection
(`DynamicPlanSelection`) → `SignupForm` → contract signing (`AguardandoAssinatura`) →
payment (`ProcessandoPagamento`, `VerificarEmailPagamento`, `PagamentoSucesso/Falha/Pendente`,
`InstrucoesPagamento`). A new paying client triggers
`create-user-from-contratacao` to provision the Supabase Auth user with a **temporary
password** (hashed via the `create_temporary_password_hash` DB RPC, validated with
`validate_temporary_password`). On first login the client is forced to change it — see
`useTemporaryPassword` and `password_changed` on `profiles`.

**Core DB tables** (`public` schema): `contratacoes_clientes` (the central client/contract
record), `correspondencias`, `categorias_correspondencia`, `documentos_admin` /
`documentos_cliente` / `documentos_disponibilidade`, `planos` + `produtos` +
`cliente_planos`, `pagamentos`, `notificacoes`, `atividades_cliente`, `profiles`,
`admin_users`, `audit_log`, `signup_submissions` (+ `form_submissions_rate_limit` for
rate limiting). Postgres RPCs back security-sensitive logic (password hashing,
`check_admin_system_health`, `calcular_proximo_vencimento`, `check_rate_limit`).

## Conventions

- **shadcn/ui** components live in `src/components/ui/` (config in `components.json`, base
  color `slate`, CSS variables on). Add new primitives via the shadcn CLI rather than copying
  by hand. Per the global UI/UX instruction, run the `ui-ux-pro-max` skill before building or
  refactoring UI.
- **Brand tokens** in `tailwind.config.ts`: `on-lime` `#60FF00`, `on-dark` `#232323`,
  `on-black` `#000000`; font `Work Sans` (`font-work-sans`). Reuse these instead of hardcoding
  hex values.
- Forms: `react-hook-form` + `zod` (`@hookform/resolvers`). Validation/format helpers
  (CPF/CNPJ/CEP, etc.) live in `src/utils/` (`validators.ts`, `formatters.ts`,
  `inputValidation.ts`, `formValidation.ts`). `useCEP` looks up Brazilian addresses.
- Toasts: two systems coexist — shadcn `useToast` (`@/hooks/use-toast`) and `sonner`. Match
  whatever the surrounding component already uses.
- Auth cleanup: prefer `forceSignOut` from `src/utils/authCleanup.ts` over a bare
  `supabase.auth.signOut()` when fully resetting session state.

## Gotchas

- The Supabase URL and anon key are **hardcoded** in `client.ts` and `src/lib/api.ts` (anon
  key is also inlined in `callEdgeFunction`). This is a public anon key by design, but means
  there is no `.env` switch for environments.
- `useAdminDataWithFallback`, `useAdminHealthCheck`, and several `*Resync` / `Sync*`
  components exist to repair drift between Supabase Auth users and the `contratacoes_clientes`
  / `admin_users` tables (a recurring source of bugs in this app). Reach for these before
  writing new ad-hoc repair logic.
