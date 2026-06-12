# Guia — Supabase CLI no ON Office

Projeto remoto: `ifpqrugbpzqpapoaameo` (São Paulo) — `https://ifpqrugbpzqpapoaameo.supabase.co`

## 1. Pré-requisitos

- Supabase CLI instalada (testado com v2.101.0): `supabase --version`
- Acesso à conta Supabase **proprietária** do projeto (a conta usada quando o projeto foi
  criado via Lovable — verifique em https://supabase.com/dashboard qual conta enxerga o
  projeto `ifpqrugbpzqpapoaameo`).

## 2. Login + Link (uma vez por máquina)

```sh
supabase login        # abre o browser; use a conta proprietária
npm run db:link       # = supabase link --project-ref ifpqrugbpzqpapoaameo
```

> ⚠️ **Erro conhecido (2026-06-12):** com outra conta logada, o link falha com
> `Your account does not have the necessary privileges to access this endpoint`.
> Em 2026-06-12 a CLI desta máquina estava logada numa conta que só enxerga os projetos
> "GREEN ARROW 1/2" e "Dashboard Cesupa" — ou seja, NÃO é a dona do ON Office.
> Soluções: (a) `supabase login` com a conta certa, ou (b) no painel, convidar seu e-mail
> para a organização do projeto com papel Developer+ e relogar.
> O link pode pedir a senha do banco (Database Password — em Settings → Database).

## 3. Operações do dia a dia

| Operação | Comando |
|----------|---------|
| Regenerar types TS do schema | `npm run db:types` |
| Aplicar migrations locais no remoto | `npm run db:push` |
| Criar nova migration | `supabase migration new <nome>` |
| Listar migrations | `supabase migration list` |
| Deploy de TODAS as Edge Functions | `npm run functions:deploy` |
| Deploy de uma function | `supabase functions deploy <nome>` |
| Logs de uma function | `supabase functions logs <nome>` |
| Dump do schema remoto | `supabase db dump -f schema.sql` |
| SQL direto no remoto (psql) | `supabase db connect` (ou psql com a connection string) |

**Importante:** `src/integrations/supabase/types.ts` é gerado — após qualquer mudança de
schema, rode `npm run db:types` e commite o resultado. Nunca edite à mão.

## 4. Frontend × env

O client (`src/integrations/supabase/client.ts`) lê `VITE_SUPABASE_URL` e
`VITE_SUPABASE_PUBLISHABLE_KEY` do `.env`, com fallback hardcoded para produção (a anon key
é pública por design; RLS protege os dados). `.env` é local e não rastreado no git — use
`.env.example` como base.

## 5. Edge Functions e segredos

As functions em `supabase/functions/` usam `SUPABASE_SERVICE_ROLE_KEY` (injetada
automaticamente pelo runtime do Supabase — não precisa configurar). Para segredos
adicionais:

```sh
supabase secrets set NOME=valor
supabase secrets list
```

`supabase/config.toml` define quais functions têm `verify_jwt = false` (funções
admin/bootstrap chamadas sem sessão). Revise antes de criar novas.

## 6. Fluxo recomendado para mudança de schema

1. `supabase migration new minha_mudanca` → editar o SQL gerado em `supabase/migrations/`
2. `npm run db:push` (aplica no remoto)
3. `npm run db:types` (regenera types)
4. Commit: migration + types juntos
