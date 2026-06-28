import React from 'react';
import { calcularProximoVencimento, paraDataISO } from '@/utils/vencimento';
import type { AssinaturaItem, AvulsoItem, Fatura } from '@/hooks/useClienteComercio';

// ============================================================================
// Três dimensões de status, alinhadas porém independentes (decisão do usuário):
//   1. CRM / funil de aquisição  → contratacoes_clientes.status_contratacao (clientesShared)
//   2. Cliente (ciclo de vida)   → DERIVADO aqui de assinaturas + faturas
//   3. Assinatura (por oferta)    → DERIVADO aqui do status da assinatura + faturas
// Nada disso exige migração: "vencido" mora na FATURA (Epic 005).
// ============================================================================

// ---------------------------------------------------------------------------
// Helpers de atraso (fonte da verdade = faturas)
// ---------------------------------------------------------------------------
export const faturaEmAberto = (f: Fatura) => f.status === 'aberta' || f.status === 'vencida';
export const faturaVencida = (f: Fatura) => f.status === 'vencida';

/** Assinatura em atraso = situação vencida OU tem fatura vencida em aberto. */
export const assinaturaEmAtraso = (a: AssinaturaItem) =>
  a.situacao === 'vencido' || a.faturas.some(faturaVencida);

// ---------------------------------------------------------------------------
// 2. Cliente — ciclo de vida: ativo | inadimplente | suspenso | cancelado
// ---------------------------------------------------------------------------
export type ClienteLifecycle = 'ativo' | 'inadimplente' | 'suspenso' | 'cancelado' | 'sem_assinatura';

interface StatusMeta {
  label: string;
  badge: string; // classes da pílula (bg + text)
  dot: string; // classe de cor do ponto
}

export const LIFECYCLE_META: Record<ClienteLifecycle, StatusMeta> = {
  ativo: { label: 'Ativo', badge: 'bg-on-lime/15 text-on-lime', dot: 'bg-on-lime' },
  inadimplente: { label: 'Inadimplente', badge: 'bg-red-500/15 text-red-300', dot: 'bg-red-400' },
  suspenso: { label: 'Suspenso', badge: 'bg-amber-400/15 text-amber-300', dot: 'bg-amber-400' },
  cancelado: { label: 'Cancelado', badge: 'bg-white/[0.07] text-muted-foreground', dot: 'bg-white/40' },
  sem_assinatura: { label: 'Sem assinatura', badge: 'bg-white/[0.07] text-muted-foreground', dot: 'bg-white/40' },
};

export const LIFECYCLE_DESC: Record<ClienteLifecycle, string> = {
  ativo: 'Assinatura vigente e em dia.',
  inadimplente: 'Há fatura vencida em aberto.',
  suspenso: 'Acesso pausado — reversível.',
  cancelado: 'Relação encerrada.',
  sem_assinatura: 'Ainda sem assinatura ativa.',
};

/** Colunas do Kanban de clientes — pelo status de ciclo de vida (não pelo funil de aquisição). */
export const LIFECYCLE_COLUMNS: { key: ClienteLifecycle; label: string; accent: string }[] = [
  { key: 'sem_assinatura', label: 'Em ativação', accent: '#818cf8' },
  { key: 'ativo', label: 'Ativo', accent: '#60FF00' },
  { key: 'inadimplente', label: 'Inadimplente', accent: '#f87171' },
  { key: 'suspenso', label: 'Suspenso', accent: '#fbbf24' },
  { key: 'cancelado', label: 'Cancelado', accent: '#9ca3af' },
];

/**
 * Deriva o status do CLIENTE a partir das assinaturas + suas faturas.
 * - sem assinaturas            → sem_assinatura
 * - todas canceladas           → cancelado
 * - todas as vivas suspensas   → suspenso
 * - alguma viva em atraso      → inadimplente
 * - caso contrário             → ativo
 */
export const deriveClienteLifecycle = (assinaturas: AssinaturaItem[]): ClienteLifecycle => {
  if (assinaturas.length === 0) return 'sem_assinatura';
  const vivas = assinaturas.filter((a) => a.status !== 'cancelado');
  if (vivas.length === 0) return 'cancelado';
  const naoSuspensas = vivas.filter((a) => a.status !== 'suspenso');
  if (naoSuspensas.length === 0) return 'suspenso';
  if (naoSuspensas.some(assinaturaEmAtraso)) return 'inadimplente';
  return 'ativo';
};

export const ClienteLifecyclePill: React.FC<{ status: ClienteLifecycle; className?: string }> = ({
  status,
  className = '',
}) => {
  const m = LIFECYCLE_META[status];
  return (
    <span className={`on-pill whitespace-nowrap text-[11px] ${m.badge} ${className}`} title={m.label}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// 3. Assinatura — status próprio por oferta
// ---------------------------------------------------------------------------
export type AssinaturaStatus =
  | 'aguardando_assinatura'
  | 'aguardando_pagamento'
  | 'vigente'
  | 'em_atraso'
  | 'suspensa'
  | 'cancelada';

export const ASSINATURA_STATUS_META: Record<AssinaturaStatus, StatusMeta> = {
  aguardando_assinatura: { label: 'Aguardando assinatura', badge: 'bg-indigo-400/15 text-indigo-200', dot: 'bg-indigo-400' },
  aguardando_pagamento: { label: 'Aguardando pagamento', badge: 'bg-orange-400/15 text-orange-300', dot: 'bg-orange-400' },
  vigente: { label: 'Vigente', badge: 'bg-on-lime/15 text-on-lime', dot: 'bg-on-lime' },
  em_atraso: { label: 'Em atraso', badge: 'bg-red-500/15 text-red-300', dot: 'bg-red-400' },
  suspensa: { label: 'Suspensa', badge: 'bg-amber-400/15 text-amber-300', dot: 'bg-amber-400' },
  cancelada: { label: 'Cancelada', badge: 'bg-white/[0.07] text-muted-foreground', dot: 'bg-white/40' },
};

/** Deriva o status da ASSINATURA (combina o status persistido com o atraso das faturas). */
export const deriveAssinaturaStatus = (a: AssinaturaItem): AssinaturaStatus => {
  switch (a.status) {
    case 'cancelado':
      return 'cancelada';
    case 'suspenso':
      return 'suspensa';
    case 'aguardando_assinatura':
      return 'aguardando_assinatura';
    case 'aguardando_pagamento':
      return 'aguardando_pagamento';
    default:
      return assinaturaEmAtraso(a) ? 'em_atraso' : 'vigente';
  }
};

export const AssinaturaStatusPill: React.FC<{ status: AssinaturaStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const m = ASSINATURA_STATUS_META[status];
  return (
    <span className={`on-pill whitespace-nowrap text-[10px] ${m.badge} ${className}`} title={m.label}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Faturamento estimado gerado ao ON Office (faturas pagas + avulsos pagos), em centavos
// ---------------------------------------------------------------------------
export const faturamentoGeradoCentavos = (assinaturas: AssinaturaItem[], avulsos: AvulsoItem[]): number => {
  const faturasPagas = assinaturas
    .flatMap((a) => a.faturas)
    .filter((f) => f.status === 'paga')
    .reduce((s, f) => s + f.valorCentavos, 0);
  const avulsosPagos = avulsos
    .filter((v) => v.pedidoStatus === 'pago')
    .reduce((s, v) => s + v.precoUnitCentavos * v.quantidade, 0);
  return faturasPagas + avulsosPagos;
};

// ---------------------------------------------------------------------------
// Períodos / histórico de renovações de uma assinatura (cada fatura = um ciclo)
// ---------------------------------------------------------------------------
export interface PeriodoAssinatura {
  faturaId: string;
  ordem: number;
  inicio: string | null; // registro (emissão) da fatura
  fim: string | null; // fim do período contratado (registro + 1 periodicidade)
  vencimento: string | null; // vencimento do pagamento — separado do período
  valorCentavos: number;
  status: string;
  pagaEm: string | null;
  criadaEm: string | null;
  descricao: string | null;
  atual: boolean;
}

/**
 * Períodos de cobrança a partir das faturas da assinatura (mais recente → mais antigo).
 * Cada fatura cobre o período contratado: do **dia do registro** até **registro + 1 periodicidade**.
 * A data de vencimento do pagamento é registrada à parte (não se mistura ao período).
 */
export const buildPeriodos = (a: AssinaturaItem): PeriodoAssinatura[] => {
  const asc = [...a.faturas].sort((x, y) => (x.criadaEm ?? '').localeCompare(y.criadaEm ?? ''));
  const periodos: PeriodoAssinatura[] = asc.map((f, i) => {
    const inicio = f.criadaEm;
    const fim = inicio ? paraDataISO(calcularProximoVencimento(new Date(inicio), a.periodicidade)) : null;
    return {
      faturaId: f.id,
      ordem: i + 1,
      inicio,
      fim,
      vencimento: f.vencimento,
      valorCentavos: f.valorCentavos,
      status: f.status,
      pagaEm: f.pagaEm,
      criadaEm: f.criadaEm,
      descricao: f.descricao,
      atual: false,
    };
  });
  // atual = fatura mais recente não cancelada
  let idxAtual = periodos.length - 1;
  for (let i = periodos.length - 1; i >= 0; i--) {
    if (periodos[i].status !== 'cancelada') {
      idxAtual = i;
      break;
    }
  }
  if (periodos[idxAtual]) periodos[idxAtual].atual = true;
  return periodos.reverse();
};

/** Código da fatura: iniciais do produto + dia da emissão + trecho do id (ex.: EF-28-AB12). */
export const codigoFatura = (id: string, produtoNome?: string | null, criadaEm?: string | null): string => {
  const words = (produtoNome || '').split(/\s+/).filter(Boolean);
  let ini = words.map((w) => w[0]).join('').toUpperCase();
  if (ini.length < 2 && words[0]) ini = words[0].slice(0, 3).toUpperCase();
  if (!ini) ini = 'FAT';
  const dia = criadaEm ? new Date(criadaEm).getDate().toString().padStart(2, '0') : '';
  return `${ini}${dia ? `-${dia}` : ''}-${id.slice(0, 4).toUpperCase()}`;
};

// ---------------------------------------------------------------------------
// Barra de progresso segmentada (com divisórias) — status do cliente e da assinatura
// ---------------------------------------------------------------------------
export type StepperTone = 'lime' | 'red' | 'amber' | 'muted' | 'indigo';

const TONE: Record<StepperTone, { fill: string; text: string }> = {
  lime: { fill: 'bg-on-lime', text: 'text-on-lime' },
  red: { fill: 'bg-red-400', text: 'text-red-300' },
  amber: { fill: 'bg-amber-400', text: 'text-amber-300' },
  muted: { fill: 'bg-white/30', text: 'text-muted-foreground' },
  indigo: { fill: 'bg-indigo-400', text: 'text-indigo-200' },
};

export interface StepperConfig {
  steps: { label: string }[];
  currentIndex: number;
  tone: StepperTone;
}

export const StatusStepper: React.FC<{
  steps: { label: string }[];
  currentIndex: number;
  tone?: StepperTone;
  showLabels?: boolean;
  className?: string;
}> = ({ steps, currentIndex, tone = 'lime', showLabels = true, className = '' }) => {
  const t = TONE[tone];
  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.label} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className={`h-full rounded-full transition-all ${i <= currentIndex ? t.fill : 'bg-transparent'} ${
                i < currentIndex ? 'opacity-60' : ''
              }`}
              style={{ width: i <= currentIndex ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>
      {showLabels && (
        <div className="mt-1.5 flex gap-1">
          {steps.map((s, i) => (
            <span
              key={s.label}
              className={`flex-1 truncate text-center text-[10px] ${
                i === currentIndex ? `font-semibold ${t.text}` : i < currentIndex ? 'text-muted-foreground' : 'text-muted-foreground/45'
              }`}
            >
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/** Stepper da ASSINATURA: processo uniforme contrato → pagamento → vigente; tom reflete o estado. */
export const assinaturaStepper = (a: AssinaturaItem): StepperConfig => {
  const s = deriveAssinaturaStatus(a);
  const steps = [{ label: 'Contrato' }, { label: 'Pagamento' }, { label: 'Vigente' }];
  switch (s) {
    case 'aguardando_assinatura':
      return { steps, currentIndex: 0, tone: 'indigo' };
    case 'aguardando_pagamento':
      return { steps, currentIndex: 1, tone: 'amber' };
    case 'em_atraso':
      return { steps, currentIndex: 2, tone: 'red' };
    case 'suspensa':
      return { steps, currentIndex: 2, tone: 'amber' };
    case 'cancelada':
      return { steps, currentIndex: 2, tone: 'muted' };
    default:
      return { steps, currentIndex: 2, tone: 'lime' };
  }
};

const TONE_DO_LIFECYCLE: Record<ClienteLifecycle, StepperTone> = {
  ativo: 'lime',
  inadimplente: 'red',
  suspenso: 'amber',
  cancelado: 'muted',
  sem_assinatura: 'indigo',
};

/**
 * Stepper do CLIENTE: cadastro → contrato → pagamento → <status atual>. A última divisória
 * mostra o status de ciclo de vida (Ativo/Inadimplente/Suspenso/Cancelado) e tinge a barra.
 */
export const clienteStepper = (funnelStatus: string, lifecycle: ClienteLifecycle): StepperConfig => {
  const finalLabel = lifecycle === 'sem_assinatura' ? 'Ativo' : LIFECYCLE_META[lifecycle].label;
  const steps = [{ label: 'Cadastro' }, { label: 'Contrato' }, { label: 'Pagamento' }, { label: finalLabel }];
  const funnelIndex: Record<string, number> = {
    iniciado: 0,
    contrato_enviado: 1,
    contrato_assinado: 1,
    pagamento_pendente: 2,
    pagamento_confirmado: 2,
    ativo: 3,
    suspenso: 3,
    cancelado: 3,
  };
  const currentIndex = lifecycle === 'sem_assinatura' ? funnelIndex[funnelStatus] ?? 0 : 3;
  return { steps, currentIndex, tone: TONE_DO_LIFECYCLE[lifecycle] };
};
