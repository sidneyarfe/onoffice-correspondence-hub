/**
 * Cálculo de vencimento de assinatura (Epic 003 · Story 3.2).
 *
 * AUTORIDADE: o banco é a fonte de verdade — RPC `calcular_vencimento_por_periodicidade` +
 * trigger `trg_cliente_planos_set_vencimento` em `cliente_planos`. Este módulo é o **espelho JS
 * único** (UX otimista) que substitui as cópias antes duplicadas em `useClientPlanos` e
 * `useAdminClients`. Mantenha as duas implementações em paridade para as 6 periodicidades.
 */

export type Periodicidade =
  | 'semanal'
  | 'mensal'
  | 'trimestral'
  | 'semestral'
  | 'anual'
  | 'bianual';

/** Próximo vencimento a partir da data de início e da periodicidade do plano. Fallback: anual. */
export function calcularProximoVencimento(
  dataInicio: Date,
  periodicidade?: string | null
): Date {
  const d = new Date(dataInicio);
  switch (periodicidade) {
    case 'semanal':
      d.setDate(d.getDate() + 7);
      break;
    case 'mensal':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'trimestral':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'semestral':
      d.setMonth(d.getMonth() + 6);
      break;
    case 'bianual':
      d.setFullYear(d.getFullYear() + 2);
      break;
    case 'anual':
    default:
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

/** Mapeia o campo legado `plano_selecionado` ('1 MES'/'1 ANO'/'2 ANOS') para periodicidade. */
export function periodicidadeDePlanoLegado(planoSelecionado?: string | null): Periodicidade {
  const p = (planoSelecionado || '').toUpperCase();
  if (p.includes('MES') || p.includes('MENSAL')) return 'mensal';
  if (p.includes('2 ANO')) return 'bianual';
  return 'anual';
}

/** Vencimento a partir do campo legado `plano_selecionado` (compat de clientes antigos). */
export function calcularVencimentoDePlanoLegado(
  dataContratacao: Date,
  planoSelecionado?: string | null
): Date {
  return calcularProximoVencimento(dataContratacao, periodicidadeDePlanoLegado(planoSelecionado));
}

/** Formata um Date como `YYYY-MM-DD` (formato esperado por colunas `date` do Postgres). */
export function paraDataISO(d: Date): string {
  return d.toISOString().split('T')[0];
}
