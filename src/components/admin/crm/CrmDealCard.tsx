import React from 'react';
import { Phone, Mail, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';
import { ORIGEM_LABEL, type CrmNegocio } from '@/integrations/supabase/crm';

interface CrmDealCardProps {
  negocio: CrmNegocio;
  onOpen: (negocio: CrmNegocio) => void;
  onDragStart: (e: React.DragEvent, negocioId: string) => void;
}

const CrmDealCard = ({ negocio, onOpen, onDragStart }: CrmDealCardProps) => {
  const contato = negocio.contato;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, negocio.id)}
      onClick={() => onOpen(negocio)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(negocio);
        }
      }}
      className="group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-all duration-200 hover:border-on-lime/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-on-lime/50"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{negocio.titulo}</p>
          {contato?.nome && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{contato.nome}</p>
          )}

          {/* tags */}
          {negocio.tags && negocio.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {negocio.tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: (t.cor ?? '#64748b') + '22',
                    color: t.cor ?? '#94a3b8',
                  }}
                >
                  {t.nome}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-[10px] font-normal">
              {ORIGEM_LABEL[contato?.origem ?? 'site']}
            </Badge>
            {negocio.valor_centavos != null && (
              <span className="font-mono text-xs font-semibold tabular-nums text-on-lime">
                {formatCurrency(negocio.valor_centavos)}
              </span>
            )}
          </div>

          {/* contatos rápidos */}
          {(contato?.telefone || contato?.email) && (
            <div className="mt-2 flex items-center gap-3 text-muted-foreground">
              {contato?.telefone && <Phone className="h-3 w-3" aria-label="Tem telefone" />}
              {contato?.email && <Mail className="h-3 w-3" aria-label="Tem e-mail" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrmDealCard;
