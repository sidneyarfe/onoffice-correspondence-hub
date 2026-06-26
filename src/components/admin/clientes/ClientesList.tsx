import React, { useMemo } from 'react';
import { Search, X, ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdminClient } from '@/hooks/useAdminClients';
import {
  ClientesFilterState,
  SortState,
  SortKey,
  STATUS_META,
  StatusPill,
  TypePill,
  ClientAvatar,
  docDe,
  filterClients,
  sortClients,
  hasActiveFilters,
  INITIAL_FILTERS,
} from './clientesShared';
import ClientesToolbar from './ClientesToolbar';

const PAGE_SIZE = 12;

interface StatCard {
  label: string;
  value: number;
  color: string;
}

interface ClientesListProps {
  clients: AdminClient[];
  filters: ClientesFilterState;
  setFilters: React.Dispatch<React.SetStateAction<ClientesFilterState>>;
  sort: SortState;
  setSort: React.Dispatch<React.SetStateAction<SortState>>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  view: 'lista' | 'kanban';
  onViewChange: (v: 'lista' | 'kanban') => void;
  onOpenFicha: (c: AdminClient) => void;
  onAdd: () => void;
  onImport: () => void;
  onExport: (rows: AdminClient[]) => void;
  onRefresh: () => void;
  loading?: boolean;
}

const SortHeader: React.FC<{
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (k: SortKey) => void;
  className?: string;
}> = ({ label, sortKey, sort, onSort, className = '' }) => (
  <th className={`select-none whitespace-nowrap px-4 py-3 text-left ${className}`}>
    <button
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      <span className="on-num text-[11px] text-on-lime">
        {sort.key === sortKey ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
      </span>
    </button>
  </th>
);

const ClientesList: React.FC<ClientesListProps> = ({
  clients,
  filters,
  setFilters,
  sort,
  setSort,
  page,
  setPage,
  view,
  onViewChange,
  onOpenFicha,
  onAdd,
  onImport,
  onExport,
  onRefresh,
  loading,
}) => {
  const stats: StatCard[] = useMemo(
    () => [
      { label: 'Total', value: clients.length, color: 'text-foreground' },
      { label: 'Ativos', value: clients.filter((c) => c.status === 'ativo').length, color: 'text-on-lime' },
      {
        label: 'Em contratação',
        value: clients.filter((c) =>
          ['iniciado', 'contrato_enviado', 'contrato_assinado', 'pagamento_confirmado'].includes(c.status),
        ).length,
        color: 'text-indigo-300',
      },
      {
        label: 'Pagamento pendente',
        value: clients.filter((c) => c.status === 'pagamento_pendente').length,
        color: 'text-orange-300',
      },
      {
        label: 'Encerrados',
        value: clients.filter((c) => ['suspenso', 'cancelado'].includes(c.status)).length,
        color: 'text-red-300',
      },
    ],
    [clients],
  );

  const planOptions = useMemo(() => [...new Set(clients.map((c) => c.plan))].filter(Boolean).sort(), [clients]);
  const ufOptions = useMemo(() => [...new Set(clients.map((c) => c.estado))].filter(Boolean).sort(), [clients]);

  const filtered = useMemo(() => filterClients(clients, filters, true), [clients, filters]);
  const sorted = useMemo(() => sortClients(filtered, sort), [filtered, sort]);

  const totalCount = clients.length;
  const filteredCount = sorted.length;
  const pages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const startI = (currentPage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(startI, startI + PAGE_SIZE);
  const rangeText =
    filteredCount === 0
      ? '0 resultados'
      : `${startI + 1}–${Math.min(startI + PAGE_SIZE, filteredCount)} de ${filteredCount}`;

  const onSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const patch = (p: Partial<ClientesFilterState>) => {
    setFilters((f) => ({ ...f, ...p }));
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <ClientesToolbar
        totalCount={totalCount}
        view={view}
        onViewChange={onViewChange}
        onExport={() => onExport(sorted)}
        onImport={onImport}
        onAdd={onAdd}
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-2.5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="min-w-[120px] flex-1 rounded-xl border border-white/[0.08] bg-card px-4 py-3"
          >
            <div className={`on-num text-[22px] font-medium leading-none ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <input
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Buscar por nome, CNPJ/CPF, e-mail, cidade, telefone…"
            className="h-10 w-full rounded-lg border border-white/10 bg-[#0e0e11] pl-9 pr-3.5 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-on-lime/50"
          />
        </div>

        <Select value={filters.status} onValueChange={(v) => patch({ status: v })}>
          <SelectTrigger className="h-10 w-[180px] border-white/10 bg-[#0e0e11] text-[13px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((k) => (
              <SelectItem key={k} value={k}>
                {STATUS_META[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.plan} onValueChange={(v) => patch({ plan: v })}>
          <SelectTrigger className="h-10 w-[170px] border-white/10 bg-[#0e0e11] text-[13px]">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            {planOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.uf} onValueChange={(v) => patch({ uf: v })}>
          <SelectTrigger className="h-10 w-[150px] border-white/10 bg-[#0e0e11] text-[13px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {ufOptions.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={(v) => patch({ type: v })}>
          <SelectTrigger className="h-10 w-[130px] border-white/10 bg-[#0e0e11] text-[13px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">PF e PJ</SelectItem>
            <SelectItem value="fisica">Pessoa Física</SelectItem>
            <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters(filters) && (
          <button
            onClick={() => {
              setFilters(INITIAL_FILTERS);
              setPage(1);
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[13px] text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
          >
            <X className="h-[14px] w-[14px]" /> Limpar
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[13px] text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
        >
          <RefreshCw className={`h-[14px] w-[14px] ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <div className="text-[13.5px] text-muted-foreground">
        <span className="on-num text-foreground">{filteredCount}</span> de{' '}
        <span className="on-num">{totalCount}</span> clientes
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr className="bg-[#0e0e11]">
                <SortHeader label="Cliente" sortKey="name" sort={sort} onSort={onSort} />
                <SortHeader label="Contato" sortKey="contato" sort={sort} onSort={onSort} />
                <SortHeader label="Local" sortKey="local" sort={sort} onSort={onSort} />
                <SortHeader label="Plano" sortKey="plan" sort={sort} onSort={onSort} />
                <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                <SortHeader label="Venc." sortKey="due" sort={sort} onSort={onSort} />
                <th className="w-[60px]" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onOpenFicha(c)}
                  className="cursor-pointer border-t border-white/[0.05] transition-colors hover:bg-white/[0.025]"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <ClientAvatar client={c} size={34} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <TypePill client={c} />
                          <span className="max-w-[230px] truncate text-[13.5px] font-semibold">{c.name}</span>
                        </div>
                        <div className="on-num mt-0.5 text-[11.5px] text-muted-foreground/80">{docDe(c)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="max-w-[210px] truncate text-[13px]">{c.email}</div>
                    <div className="on-num mt-0.5 text-[11.5px] text-muted-foreground/80">{c.telefone}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-[13px]">{c.cidade}</div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground/80">
                      {c.bairro && c.bairro !== 'Não informado' ? `${c.bairro} · ` : ''}
                      {c.estado}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="max-w-[170px] truncate text-[12.5px] text-muted-foreground">{c.plan}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={c.status} short />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="on-num text-[12.5px] text-muted-foreground">{c.nextDue}</span>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <ChevronRight className="ml-auto h-[18px] w-[18px] text-muted-foreground/60" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCount === 0 && (
          <div className="px-5 py-12 text-center text-muted-foreground">
            Nenhum cliente encontrado com os filtros aplicados.
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
          <div className="text-[12.5px] text-muted-foreground">{rangeText}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors enabled:hover:border-white/25 enabled:hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="h-[15px] w-[15px]" />
            </button>
            <span className="on-num text-[12.5px] text-muted-foreground">
              {currentPage} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={currentPage >= pages}
              className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors enabled:hover:border-white/25 enabled:hover:text-foreground disabled:opacity-40"
            >
              <ChevronRight className="h-[15px] w-[15px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientesList;
