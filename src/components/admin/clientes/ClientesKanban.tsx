import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import { ClientesFilterState, FunnelColumn, TypePill, docDe, filterClients } from './clientesShared';
import { ClienteLifecyclePill, LIFECYCLE_COLUMNS } from './clienteStatus';
import ClientesToolbar from './ClientesToolbar';

interface ClientesKanbanProps {
  clients: AdminClient[];
  filters: ClientesFilterState;
  totalCount: number;
  view: 'lista' | 'kanban';
  onViewChange: (v: 'lista' | 'kanban') => void;
  onExport: (rows: AdminClient[]) => void;
  onImport: () => void;
  onAdd: () => void;
  onOpenFicha: (c: AdminClient) => void;
  /** legado do funil — não usado no board por ciclo de vida (mantido p/ compat) */
  onDropClient?: (client: AdminClient, column: FunnelColumn['key']) => void;
}

const KanbanCard: React.FC<{ client: AdminClient; onOpen: () => void }> = ({ client, onOpen }) => {
  const accent = '#' + (client.tipo_pessoa === 'juridica' ? '60FF00' : '818cf8');
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ borderLeft: `3px solid ${accent}66` }}
      className="w-full cursor-pointer rounded-[10px] border border-white/[0.07] bg-[#17171a] px-[11px] py-2.5 text-left transition-colors hover:border-white/20"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <TypePill client={client} />
        <span className="flex-1 truncate text-[12.5px] font-semibold">{client.name}</span>
      </div>
      <div className="on-num mb-2 truncate text-[10.5px] text-muted-foreground/80">{docDe(client)}</div>
      <div className="flex items-center justify-between gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[10.5px] text-muted-foreground">{client.plan}</span>
        {client.lifecycle && <ClienteLifecyclePill status={client.lifecycle} />}
      </div>
    </button>
  );
};

const ClientesKanban: React.FC<ClientesKanbanProps> = ({
  clients,
  filters,
  totalCount,
  view,
  onViewChange,
  onExport,
  onImport,
  onAdd,
  onOpenFicha,
}) => {
  const base = useMemo(() => filterClients(clients, filters, false), [clients, filters]);

  const columns = useMemo(
    () =>
      LIFECYCLE_COLUMNS.map((col) => ({
        ...col,
        cards: base.filter((c) => (c.lifecycle ?? 'sem_assinatura') === col.key),
      })),
    [base],
  );

  return (
    <div className="space-y-5">
      <ClientesToolbar
        totalCount={totalCount}
        view={view}
        onViewChange={onViewChange}
        onExport={() => onExport(base)}
        onImport={onImport}
        onAdd={onAdd}
      />

      <div className="flex items-start gap-3 rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-3">
        <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
        <div className="text-[13px] leading-relaxed text-muted-foreground">
          Clientes agrupados pelo <b className="text-foreground">status atual</b> (ciclo de vida). Clique em um card para
          abrir a ficha — renovar, suspender ou cancelar é feito por lá, respeitando as regras de cada ação. O funil de
          aquisição (leads) fica no <b className="text-foreground">CRM</b>.
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[1000px] gap-3">
          {columns.map((col) => (
            <div key={col.key} className="flex min-w-[195px] flex-1 flex-col gap-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />
                <span className="truncate text-[12.5px] font-bold">{col.label}</span>
                <span className="on-num ml-auto rounded-full bg-white/[0.06] px-2 py-px text-[11.5px] text-muted-foreground">
                  {col.cards.length}
                </span>
              </div>
              <div className="flex min-h-[140px] flex-col gap-2.5 rounded-xl border border-dashed border-white/[0.08] bg-[#0e0e11]/40 p-2.5">
                {col.cards.map((c) => (
                  <KanbanCard key={c.id} client={c} onOpen={() => onOpenFicha(c)} />
                ))}
                {col.cards.length === 0 && (
                  <div className="py-6 text-center text-[11.5px] text-muted-foreground/50">Vazio</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientesKanban;
