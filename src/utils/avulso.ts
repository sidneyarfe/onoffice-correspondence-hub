/**
 * Avulsos (salas) — precificação por HORA BASE.
 * A oferta avulsa guarda o preço por HORA; as modalidades derivam por multiplicador de horas.
 * Constante de horas por modalidade (ajustável conforme a regra de negócio das salas).
 */
export type AvulsoUnidade = 'hora' | 'meia_diaria' | 'diaria' | 'mes' | 'trimestre' | 'semestre';

export const AVULSO_UNIDADES: { value: AvulsoUnidade; label: string; horas: number }[] = [
  { value: 'hora', label: 'Hora', horas: 1 },
  { value: 'meia_diaria', label: 'Meia diária (4h)', horas: 4 },
  { value: 'diaria', label: 'Diária (8h)', horas: 8 },
  { value: 'mes', label: 'Mês (160h)', horas: 160 },
  { value: 'trimestre', label: 'Trimestre (480h)', horas: 480 },
  { value: 'semestre', label: 'Semestre (960h)', horas: 960 },
];

export const horasDe = (u?: string | null): number => AVULSO_UNIDADES.find((x) => x.value === u)?.horas ?? 1;

export const labelUnidade = (u?: string | null): string =>
  AVULSO_UNIDADES.find((x) => x.value === u)?.label ?? (u || 'unidade');

/** Preço (centavos) de uma modalidade a partir do preço/hora base (centavos). */
export const precoModalidadeCentavos = (precoHoraCentavos: number, unidade: string): number =>
  Math.round((precoHoraCentavos || 0) * horasDe(unidade));
