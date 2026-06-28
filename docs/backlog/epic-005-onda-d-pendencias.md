# Backlog — Pendências da Onda D (Epic 005)

**Origem:** QA gate `docs/qa/gates/epic-005-onda-d-gate.yaml` (verdict CONCERNS, 2026-06-28).
**Status geral:** stories 5.7–5.10 **Done**; itens abaixo ficam como **tarefas pendentes** (nenhum bloqueia).

> Decisão do usuário (2026-06-28): resolver depois; registrado como backlog.

| # | Tarefa | Prioridade | Dono | Status | Ação |
|---|--------|------------|------|--------|------|
| ISSUE-002 | **E-mail de notificação** não envia (edge fn não deployada) | Média | @devops | ⏳ Pendente | `supabase functions deploy enviar-notificacao` + `supabase secrets set RESEND_API_KEY=…` (domínio verificado no Resend). Até lá, e-mail é no-op; notificação interna funciona. |
| ISSUE-003 | **Carrinho do CRM não dispara contrato ZapSign** neste passo (mudança de comportamento) | Média | Usuário / @pm + @dev | ⏳ Pendente | Confirmar fluxo desejado. Se sim, plugar `enviar-contrato` para a assinatura principal no submit do carrinho (`IniciarContratacaoDialog`). |
| ISSUE-001 | **Sem test runner** — features financeiras só por gates estáticos + manual | Média | @qa + @dev | ⏳ Pendente | Introduzir Vitest; testar `deriveClienteLifecycle`, `buildPeriodos`, `codigoFatura`, fluxos de fatura. |
| ISSUE-004 | Vínculo **documento↔assinatura via token** na `descricao` (`docPin`) em vez de FK | Baixa | @data-engineer + @dev | ⏳ Pendente | Adicionar `assinatura_id` a `documentos_cliente` (migração + regen `types.ts`) e migrar o token. |
| ISSUE-005 | **Lifecycle derivado em bulk** no client (2 queries por fetch de clientes) | Baixa | @data-engineer | ⏳ Pendente | Mover para VIEW/RPC agregada ou coluna persistida por job (alinha com 5.2/5.3). |
| ISSUE-006 | **Cache de módulo** em vez de TanStack Query nos hooks de seção | Baixa | @dev | ⏳ Pendente | Migrar hooks de seção (`useAdminClients`, `useProducts`, `useAdminCorrespondences`, `useAdminDocuments`, `useAdminData`) para `useQuery` com `staleTime`. |
| ISSUE-007 | Documentos de onboarding em **bucket público** `documentos_fiscais` | Baixa | @data-engineer | ⏳ Pendente | Avaliar bucket privado + signed URLs para contrato/comprovante. |
| ISSUE-008 | **Lista de clientes** ainda mostra status do funil (não o ciclo de vida); Kanban virou somente-leitura | Baixa | @ux-design-expert + @dev | ⏳ Pendente | Refletir o ciclo de vida também na lista; decidir se o board precisa de ações rápidas. |

## Notas
- Migrações de RLS desta onda **já estão em prod** (`20260627210000`, `20260628120000`) — não há pendência de banco.
- Reabrir como stories (5.11+) quando priorizadas; cada uma referencia o ISSUE-id deste backlog.
