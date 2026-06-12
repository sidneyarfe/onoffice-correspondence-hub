# Epic 001 — Independência da Plataforma & Modernização

**Status:** Concluído (1 pendência externa: `supabase login` com a conta proprietária + `npm run db:link`)
**Owner:** @pm (Morgan)
**Criado em:** 2026-06-12
**Projeto:** ON Office — Correspondence Hub (SaaS de escritório virtual / endereço fiscal)

## Objetivo

Tornar o projeto totalmente independente do Lovable (onde foi gerado), estabelecer acesso
completo ao banco via Supabase CLI, corrigir bugs de desenvolvimento identificados na
varredura e modernizar o design dos dashboards (cliente e admin) inspirado em dashboards
fintech contemporâneos (referência Fynix), preservando a identidade visual ON Office
(`on-lime #60FF00`, `on-dark #232323`, `on-black #000000`, fonte Work Sans).

## Contexto (varredura brownfield — 2026-06-12)

- **Lovable:** `lovable-tagger` (devDep + plugin Vite), README 100% Lovable, favicon em CDN
  externo (gpt-engineer storage), logos em `public/lovable-uploads/*` com nomes hash,
  menção "Lovable project" no CLAUDE.md.
- **Supabase:** URL + anon key hardcoded em `src/integrations/supabase/client.ts` e
  `src/lib/api.ts` (sem leitura de env). `.env` já contém `VITE_SUPABASE_*` (não usados).
  CLI v2.101.0 instalada e logada, porém **a conta logada não tem acesso ao projeto
  `ifpqrugbpzqpapoaameo`** (erro de privilégio no `supabase link`) — requer login com a
  conta proprietária (provável conta usada no Lovable). `.env` está rastreado no git apesar
  do `.gitignore` (committed antes da regra).
- **Bugs identificados:**
  1. Allowlist de e-mails admin duplicada em **11 arquivos** (AuthContext, ProtectedRoute,
     LoginPage, ForgotPassword, useAdminData, useAdminDataWithFallback, useAdminHealthCheck,
     useAdminCorrespondences, useCorrespondenceCategories, useDocuments,
     useDocumentFormLogic) — com variações inconsistentes entre si.
  2. `AdminOverview.tsx:151` — expressão JSX morta `{user?.email === '...'}` que não
     renderiza nada (componente `TempPasswordResync` importado e nunca usado).
  3. `AdminSidebar.handleLogout` — remove chaves localStorage inexistentes
     (`admin_token`/`admin_user`) e redireciona para `/admin/login`, rota que não existe
     (cai no catch-all do ProtectedRoute). Não usa o logout do AuthContext.
  4. `AdminHeader` — badge de notificação **hardcoded "5"** (dado falso) e botão Settings
     sem ação.
  5. Handlers de logout chamam `logout()` sem await e navegam em seguida —
     redundante/corrida com o redirect interno do AuthContext.
- **UI/UX:** visual padrão shadcn pouco refinado; cards com cores arbitrárias
  (azul/roxo/laranja) fora da identidade; sidebar sem hierarquia; sem hero card;
  espaçamentos e raios inconsistentes.

## Stories

| ID | Story | Status | QA |
|----|-------|--------|----|
| 1.1 | Desacoplamento do Lovable (build, docs, assets) | Done | PASS |
| 1.2 | Configuração Supabase por ambiente + Supabase CLI | Done | PASS (pendência externa) |
| 1.3 | Correção de bugs de desenvolvimento | Done | PASS |
| 1.4 | Modernização UI/UX dos dashboards (referência Fynix, brand ON) | Done | CONCERNS (smoke visual pendente) |

## Backlog derivado (fora deste épico)

- Tech debt lint: 52 erros / 25 warnings pré-existentes (`ResetPassword`, `validators`,
  hooks `exhaustive-deps`, etc.)
- Code-splitting: chunk JS de 2,15 MB (aviso do Vite) — dynamic import por dashboard
- Migrar páginas internas (Correspondências, Documentos, Financeiro, Perfil, modais) para
  o novo design system componente a componente
- Remover manualmente `public/lovable-uploads/` (sem referências; deleção bloqueada por
  permissão na sessão)
- Avaliar `.maybeSingle()` em `AuthContext.fetchUserData` (cliente sem contratação)

## Restrições

- Strings de UI e termos de domínio permanecem em **pt-BR**.
- Brand tokens obrigatórios: `on-lime #60FF00`, `on-dark #232323`, `on-black #000000`,
  Work Sans.
- Skill `ui-ux-pro-max` obrigatória antes de qualquer código de UI (Design Governance).
- Sem test runner configurado — gates usam `npm run lint`, `npx tsc --noEmit` e
  `npm run build`.
- `git push` / PR: exclusivo @devops, somente sob ordem do usuário.

## Critérios de sucesso do épico

1. `npm run dev` e `npm run build` funcionam sem qualquer dependência/artefato Lovable.
2. Supabase client lê configuração de `import.meta.env` com fallback seguro; instruções
   completas para `supabase link` + regeneração de types documentadas.
3. Zero duplicação da allowlist admin; bugs 1-5 corrigidos; lint + typecheck + build verdes.
4. Dashboards cliente e admin com novo design system (fundo neutro claro, cards brancos
   raio 1rem, hero lime, sidebar com item ativo lime), WCAG AA nos contrastes principais.
