import React, { useMemo, useState } from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import {
  ClientesFilterState,
  FUNNEL_COLUMNS,
  FunnelColumn,
  TypePill,
  deriveFlags,
  filterClients,
} from './clientesShared';
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
  /** dropou o cliente na coluna — o container aplica status/guardrails/modais */
  onDropClient: (client: AdminClient, column: FunnelColumn['key']) => void;
}

const KanbanCard: React.FC<{
  client: AdminClient;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}> = ({ client, onOpen, onDragStart, onDragEnd }) => {
  const { assinado, pago } = deriveFlags(client);
  const accent = '#' + (client.tipo_pessoa === 'juridica' ? '60FF00' : '818cf8');
  return (
    <div
      draggable
      onDragStart={(e) => {
        try {
          e.dataTransfer.setData('text/plain', client.id);
          e.dataTransfer.effectAllowed = 'move';
        } catch {
          /* noop */
        }
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      style={{ borderLeft: `3px solid ${accent}66` }}
      className="cursor-grab rounded-[10px] border border-white/[0.07] bg-[#17171a] px-[11px] py-2.5 transition-colors hover:border-white/20 active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <TypePill client={client} />
        <span className="flex-1 truncate text-[12.5px] font-semibold">{client.name}</span>
      </div>
      <div className="on-num mb-2 truncate text-[10.5px] text-muted-foreground/80">
        {client.tipo_pessoa === 'juridica' ? client.cnpj : client.cpf_responsavel}
      </div>
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10.5px] text-muted-foreground">{client.periodicidade || client.plan}</span>
        <div className="flex items-center gap-1">
          {assinado && (
            <span
              title="Contrato assinado"
              className="inline-flex items-center gap-0.5 rounded-full bg-indigo-400/15 px-1.5 py-0.5 text-[9.5px] font-bold text-indigo-300"
            >
              <Check className="h-2.5 w-2.5" /> Ass.
            </span>
          )}
          {pago && (
            <span
              title="Pagamento confirmado"
              className="inline-flex items-center gap-0.5 rounded-full bg-on-lime/15 px-1.5 py-0.5 text-[9.5px] font-bold text-on-lime"
            >
              <Check className="h-2.5 w-2.5" /> Pago
            </span>
          )}
        </div>
      </div>
    </div>
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
  onDropClient,
}) => {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const base = useMemo(() => filterClients(clients, filters, false), [clients, filters]);

  const columns = useMemo(
    () =>
      FUNNEL_COLUMNS.map((col) => ({
        ...col,
        cards: base.filter((c) => col.statuses.includes(c.status)),
      })),
    [base],
  );

  const handleDrop = (colKey: FunnelColumn['key']) => {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const client = clients.find((c) => c.id === id);
    if (client) onDropClient(client, colKey);
  };

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

      <div className="flex items-start gap-3 rounded-xl border border-on-lime/20 bg-on-lime/5 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-on-lime" />
        <div className="text-[13px] leading-relaxed text-on-lime/85">
          Funil de contratação. Arraste os cards para avançar a etapa. Mover para{' '}
          <b className="text-on-lime">Contrato Assinado</b> abre o anexo do contrato assinado; mover para{' '}
          <b className="text-on-lime">Ativo</b> abre a cobrança — só conclui após o registro de fato, protegendo o
          processo.
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[1180px] gap-3">
          {columns.map((col) => {
            const isOver = overCol === col.key;
            return (
              <div key={col.key} className="flex min-w-[188px] flex-1 flex-col gap-2.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />
                  <span className="truncate text-[12.5px] font-bold">{col.label}</span>
                  <span className="on-num ml-auto rounded-full bg-white/[0.06] px-2 py-px text-[11.5px] text-muted-foreground">
                    {col.cards.length}
                  </span>
                </div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (overCol !== col.key) setOverCol(col.key);
                  }}
                  onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(col.key);
                  }}
                  style={isOver ? { borderColor: `${col.accent}aa`, background: `${col.accent}0d` } : undefined}
                  className="flex min-h-[140px] flex-col gap-2.5 rounded-xl border border-dashed border-white/[0.08] bg-[#0e0e11]/40 p-2.5 transition-colors"
                >
                  {col.cards.map((c) => (
                    <KanbanCard
                      key={c.id}
                      client={c}
                      onOpen={() => onOpenFicha(c)}
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                    />
                  ))}
                  {col.cards.length === 0 && (
                    <div className="py-6 text-center text-[11.5px] text-muted-foreground/50">Vazio</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClientesKanban;
