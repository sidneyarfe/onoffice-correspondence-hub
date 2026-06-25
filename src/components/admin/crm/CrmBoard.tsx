import React, { useState } from 'react';
import CrmDealCard from './CrmDealCard';
import { formatCurrency } from '@/utils/formatters';
import type { CrmEtapa, CrmNegocio } from '@/integrations/supabase/crm';

interface CrmBoardProps {
  etapas: CrmEtapa[];
  negocios: CrmNegocio[];
  onOpenDeal: (negocio: CrmNegocio) => void;
  onMove: (negocioId: string, etapa: CrmEtapa) => void;
}

const CrmBoard = ({ etapas, negocios, onOpenDeal, onMove }: CrmBoardProps) => {
  const [dragOverEtapa, setDragOverEtapa] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, negocioId: string) => {
    e.dataTransfer.setData('text/plain', negocioId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, etapa: CrmEtapa) => {
    e.preventDefault();
    setDragOverEtapa(null);
    const negocioId = e.dataTransfer.getData('text/plain');
    if (negocioId) onMove(negocioId, etapa);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-4 overflow-x-auto pb-1">
      {etapas.map((etapa) => {
        const cards = negocios.filter((n) => n.etapa_id === etapa.id);
        const total = cards.reduce((s, c) => s + (c.valor_centavos ?? 0), 0);
        const isOver = dragOverEtapa === etapa.id;
        return (
          <section
            key={etapa.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverEtapa(etapa.id);
            }}
            onDragLeave={() => setDragOverEtapa((cur) => (cur === etapa.id ? null : cur))}
            onDrop={(e) => handleDrop(e, etapa)}
            className={`flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border bg-muted/30 transition-colors ${
              isOver ? 'border-on-lime/60 bg-on-lime/5' : 'border-border'
            }`}
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: etapa.cor ?? '#64748b' }}
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-foreground">{etapa.nome}</h3>
                <span className="rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                  {cards.length}
                </span>
              </div>
              {total > 0 && (
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {formatCurrency(total)}
                </span>
              )}
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
              {cards.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground/60">
                  Arraste um negócio para cá
                </p>
              ) : (
                cards.map((n) => (
                  <CrmDealCard key={n.id} negocio={n} onOpen={onOpenDeal} onDragStart={handleDragStart} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default CrmBoard;
