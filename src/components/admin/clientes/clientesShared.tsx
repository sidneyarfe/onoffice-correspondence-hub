import React from 'react';
import type { AdminClient } from '@/hooks/useAdminClients';

// ============================================================================
// Status — rótulos, cores de pílula e de "dot" (reformulação Clientes)
// ============================================================================
export type ClientStatus = AdminClient['status'];

interface StatusMeta {
  label: string;
  short: string;
  badge: string; // classes da pílula (bg + text)
  dot: string; // classe de cor do ponto
}

export const STATUS_META: Record<ClientStatus, StatusMeta> = {
  iniciado: { label: 'Iniciado', short: 'Iniciado', badge: 'bg-blue-500/15 text-blue-300', dot: 'bg-blue-400' },
  contrato_enviado: { label: 'Contrato Enviado', short: 'Contrato env.', badge: 'bg-purple-500/15 text-purple-300', dot: 'bg-purple-400' },
  contrato_assinado: { label: 'Contrato Assinado', short: 'Contrato ass.', badge: 'bg-indigo-500/15 text-indigo-300', dot: 'bg-indigo-400' },
  pagamento_pendente: { label: 'Pagamento Pendente', short: 'Pag. pendente', badge: 'bg-orange-400/15 text-orange-300', dot: 'bg-orange-400' },
  pagamento_confirmado: { label: 'Pagamento Confirmado', short: 'Pag. confirm.', badge: 'bg-on-lime/15 text-on-lime', dot: 'bg-on-lime' },
  ativo: { label: 'Ativo', short: 'Ativo', badge: 'bg-on-lime/15 text-on-lime', dot: 'bg-on-lime' },
  suspenso: { label: 'Suspenso', short: 'Suspenso', badge: 'bg-amber-400/15 text-amber-300', dot: 'bg-amber-400' },
  cancelado: { label: 'Cancelado', short: 'Cancelado', badge: 'bg-red-500/15 text-red-300', dot: 'bg-red-400' },
};

export const statusMeta = (s: ClientStatus): StatusMeta => STATUS_META[s] ?? STATUS_META.iniciado;

// ============================================================================
// Helpers de formatação
// ============================================================================
export const brl = (reais: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(reais) ? reais : 0);

/** preço guardado em centavos → string BRL */
export const brlCentavos = (centavos?: number | null) => brl((centavos ?? 0) / 100);

/** mensalidade do cliente em reais (preco em centavos) */
export const mensalidadeReais = (c: AdminClient) => (c.preco ? c.preco / 100 : 0);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const AVATAR_PALETTE = ['#60a5fa', '#c084fc', '#fb923c', '#34d399', '#f472b6', '#fbbf24', '#22d3ee', '#a5b4fc'];
export const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
};

/** "dd/mm/aaaa" → timestamp (para ordenação) */
export const brDateValue = (s?: string) => {
  if (!s) return 0;
  const t = new Date(s.split('/').reverse().join('-')).getTime();
  return Number.isNaN(t) ? 0 : t;
};

export const docDe = (c: AdminClient) => (c.tipo_pessoa === 'juridica' ? c.cnpj : c.cpf_responsavel);
export const isPJ = (c: AdminClient) => c.tipo_pessoa === 'juridica';

// ============================================================================
// Derivação de flags do funil (assinado / pago) a partir do status + campos
// ============================================================================
export const deriveFlags = (c: AdminClient) => {
  const assinado =
    ['contrato_assinado', 'pagamento_pendente', 'pagamento_confirmado', 'ativo', 'suspenso'].includes(c.status) ||
    !!c.contrato_assinado_url;
  const pago = ['pagamento_confirmado', 'ativo', 'suspenso'].includes(c.status);
  return { assinado, pago };
};

/**
 * Vencido (derivado na leitura): cliente ativo cujo `nextDue` (dd/mm/aaaa) já passou.
 * O job diário da Story 5.2 persiste esse estado; aqui é a derivação para a UI.
 */
export const isVencido = (c: AdminClient) => {
  if (c.status !== 'ativo') return false;
  const t = brDateValue(c.nextDue);
  if (!t) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return t < hoje.getTime();
};

/** Pílula "Vencido" (vermelho-âmbar) para o estado derivado. */
export const VencidoPill: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`on-pill whitespace-nowrap text-[11px] bg-red-500/15 text-red-300 ${className}`} title="Vencimento no passado">
    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
    Vencido
  </span>
);

// ============================================================================
// Funil — colunas do Kanban
// ============================================================================
export interface FunnelColumn {
  key: 'iniciado' | 'contrato_enviado' | 'contrato_assinado' | 'pagamento' | 'ativo' | 'encerrado';
  label: string;
  statuses: ClientStatus[];
  accent: string;
}

export const FUNNEL_COLUMNS: FunnelColumn[] = [
  { key: 'iniciado', label: 'Iniciado', statuses: ['iniciado'], accent: '#60a5fa' },
  { key: 'contrato_enviado', label: 'Contrato Enviado', statuses: ['contrato_enviado'], accent: '#c084fc' },
  { key: 'contrato_assinado', label: 'Contrato Assinado', statuses: ['contrato_assinado'], accent: '#818cf8' },
  { key: 'pagamento', label: 'Pagamento', statuses: ['pagamento_pendente', 'pagamento_confirmado'], accent: '#fb923c' },
  { key: 'ativo', label: 'Ativo', statuses: ['ativo'], accent: '#60FF00' },
  { key: 'encerrado', label: 'Encerrado', statuses: ['suspenso', 'cancelado'], accent: '#f87171' },
];

// ============================================================================
// Timeline "Situação do cliente"
// ============================================================================
export type StepState = 'done' | 'current' | 'pending' | 'terminal';
export interface TimelineStep {
  label: string;
  state: StepState;
  sub: string;
  color?: string; // só para terminal
}

const FLOW = ['Cadastro iniciado', 'Contrato enviado', 'Contrato assinado', 'Pagamento confirmado', 'Cliente ativo'];
const CURRENT_INDEX: Record<ClientStatus, number> = {
  iniciado: 0,
  contrato_enviado: 1,
  contrato_assinado: 2,
  pagamento_pendente: 3,
  pagamento_confirmado: 4,
  ativo: 5,
  suspenso: 5,
  cancelado: 2,
};

export const buildTimeline = (status: ClientStatus): TimelineStep[] => {
  const cur = CURRENT_INDEX[status] ?? 0;
  const terminal =
    status === 'cancelado'
      ? { label: 'Contratação cancelada', color: '#f87171' }
      : status === 'suspenso'
      ? { label: 'Cliente suspenso', color: '#fbbf24' }
      : null;

  const steps: TimelineStep[] = FLOW.map((label, i) => {
    let state: StepState = i < cur ? 'done' : i === cur ? 'current' : 'pending';
    if (terminal && i >= cur) state = 'pending';
    return {
      label,
      state,
      sub: state === 'done' ? 'Concluído' : state === 'current' ? 'Etapa atual' : 'Pendente',
    };
  });

  if (terminal) {
    steps.push({ label: terminal.label, state: 'terminal', sub: 'Encerrado', color: terminal.color });
  }
  return steps;
};

// ============================================================================
// Filtros + ordenação (compartilhado entre Lista e Kanban)
// ============================================================================
export interface ClientesFilterState {
  search: string;
  status: string; // 'all' | ClientStatus
  plan: string; // 'all' | plano
  uf: string; // 'all' | estado
  type: string; // 'all' | 'fisica' | 'juridica'
}

export const EMPTY_FILTERS: ClientesFilterState = { search: 'all', status: 'all', plan: 'all', uf: 'all', type: 'all' };
export const INITIAL_FILTERS: ClientesFilterState = { search: '', status: 'all', plan: 'all', uf: 'all', type: 'all' };

export type SortKey = 'name' | 'contato' | 'local' | 'plan' | 'status' | 'due';
export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

export const hasActiveFilters = (f: ClientesFilterState) =>
  f.search !== '' || f.status !== 'all' || f.plan !== 'all' || f.uf !== 'all' || f.type !== 'all';

/** filtra por busca + plano + uf + tipo. `includeStatus=false` para o Kanban (que tem colunas por status). */
export const filterClients = (clients: AdminClient[], f: ClientesFilterState, includeStatus = true) => {
  const q = f.search.trim().toLowerCase();
  return clients.filter((c) => {
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      docDe(c).toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.cidade.toLowerCase().includes(q) ||
      c.estado.toLowerCase().includes(q) ||
      (c.telefone || '').includes(f.search.trim());
    const matchesPlan = f.plan === 'all' || c.plan === f.plan;
    const matchesUf = f.uf === 'all' || c.estado === f.uf;
    const matchesType = f.type === 'all' || c.tipo_pessoa === f.type;
    const matchesStatus = !includeStatus || f.status === 'all' || c.status === f.status;
    return matchesSearch && matchesPlan && matchesUf && matchesType && matchesStatus;
  });
};

export const sortClients = (clients: AdminClient[], sort: SortState) => {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...clients].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (sort.key) {
      case 'status':
        av = a.status;
        bv = b.status;
        break;
      case 'due':
        av = brDateValue(a.nextDue);
        bv = brDateValue(b.nextDue);
        break;
      case 'plan':
        av = a.plan.toLowerCase();
        bv = b.plan.toLowerCase();
        break;
      case 'local':
        av = `${a.cidade}${a.estado}`.toLowerCase();
        bv = `${b.cidade}${b.estado}`.toLowerCase();
        break;
      case 'contato':
        av = a.email.toLowerCase();
        bv = b.email.toLowerCase();
        break;
      default:
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
    }
    return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
  });
};

// ============================================================================
// Componentes de apresentação compartilhados
// ============================================================================
export const StatusPill: React.FC<{ status: ClientStatus; short?: boolean; className?: string }> = ({
  status,
  short = false,
  className = '',
}) => {
  const m = statusMeta(status);
  return (
    <span className={`on-pill whitespace-nowrap text-[11px] ${m.badge} ${className}`} title={m.label}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.dot}`} />
      {short ? m.short : m.label}
    </span>
  );
};

export const TypePill: React.FC<{ client: AdminClient; className?: string }> = ({ client, className = '' }) => (
  <span
    className={`on-pill text-[10px] tracking-wide ${
      isPJ(client) ? 'bg-on-lime/15 text-on-lime' : 'bg-white/10 text-muted-foreground'
    } ${className}`}
  >
    {isPJ(client) ? 'PJ' : 'PF'}
  </span>
);

export const ClientAvatar: React.FC<{ client: AdminClient; size?: number; rounded?: string }> = ({
  client,
  size = 34,
  rounded = '0.6rem',
}) => {
  const color = avatarColor(client.name);
  if (client.avatar_url) {
    return (
      <img
        src={client.avatar_url}
        alt={client.name}
        style={{ width: size, height: size, borderRadius: rounded, objectFit: 'cover', border: `1px solid ${color}55` }}
        className="shrink-0"
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        fontSize: size * 0.36,
        background: `${color}22`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {initials(client.name)}
    </div>
  );
};
