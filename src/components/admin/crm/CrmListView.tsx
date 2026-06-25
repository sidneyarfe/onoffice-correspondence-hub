import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';
import { ORIGEM_LABEL, type CrmEtapa, type CrmNegocio } from '@/integrations/supabase/crm';

interface CrmListViewProps {
  etapas: CrmEtapa[];
  negocios: CrmNegocio[];
  onOpenDeal: (negocio: CrmNegocio) => void;
}

const CrmListView = ({ etapas, negocios, onOpenDeal }: CrmListViewProps) => {
  const etapaById = new Map(etapas.map((e) => [e.id, e]));

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border border-border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Negócio</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {negocios.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                Nenhum negócio ainda.
              </TableCell>
            </TableRow>
          ) : (
            negocios.map((n) => {
              const etapa = n.etapa_id ? etapaById.get(n.etapa_id) : undefined;
              return (
                <TableRow
                  key={n.id}
                  onClick={() => onOpenDeal(n)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{n.titulo}</TableCell>
                  <TableCell className="text-muted-foreground">{n.contato?.nome ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {ORIGEM_LABEL[n.contato?.origem ?? 'site']}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {etapa ? (
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: etapa.cor ?? '#64748b' }}
                        />
                        {etapa.nome}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(n.tags ?? []).map((t) => (
                        <span
                          key={t.id}
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: (t.cor ?? '#64748b') + '22', color: t.cor ?? '#94a3b8' }}
                        >
                          {t.nome}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {n.valor_centavos != null ? formatCurrency(n.valor_centavos) : '—'}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CrmListView;
