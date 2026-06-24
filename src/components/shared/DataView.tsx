import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Table2,
} from 'lucide-react';

/**
 * DataView — padrão do projeto para listas de dados (epic 002, story 2.7).
 * Dupla visualização (tabela densa estilo Stripe + grid de cards), ordenação por
 * coluna e paginação. Filtros/busca ficam na página (passe `data` já filtrado).
 */
export interface DataViewColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  /** habilita ordenação na coluna */
  sortValue?: (item: T) => string | number;
  /** classes do <th> — use para largura e visibilidade responsiva (ex.: hidden lg:table-cell w-[12%]) */
  headClassName?: string;
  /** classes do <td> — espelhe a visibilidade do header */
  cellClassName?: string;
}

interface DataViewProps<T> {
  data: T[];
  columns: DataViewColumn<T>[];
  getRowId: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  /** chave de persistência do modo de visualização (localStorage) */
  storageKey: string;
  initialSort?: { key: string; direction: 'asc' | 'desc' };
  pageSizeOptions?: number[];
  emptyState?: React.ReactNode;
  cardGridClassName?: string;
}

type ViewMode = 'table' | 'cards';

export function DataView<T>({
  data,
  columns,
  getRowId,
  renderCard,
  storageKey,
  initialSort,
  pageSizeOptions = [25, 50, 100],
  emptyState,
  cardGridClassName = 'grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3',
}: DataViewProps<T>) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`dataview:${storageKey}`) : null;
    return saved === 'cards' ? 'cards' : 'table';
  });
  const [sortKey, setSortKey] = useState<string>(initialSort?.key ?? '');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSort?.direction ?? 'asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(pageSizeOptions[1] ?? pageSizeOptions[0]);

  useEffect(() => {
    localStorage.setItem(`dataview:${storageKey}`, viewMode);
  }, [viewMode, storageKey]);

  // Volta para a primeira página quando dados/ordenação/tamanho mudam
  useEffect(() => {
    setPage(1);
  }, [data, sortKey, sortDirection, pageSize]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDirection === 'asc' ? -1 : 1;
      if (av > bv) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [data, columns, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize],
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortIcon = (key: string) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-on-lime" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-on-lime" />
    );
  };

  return (
    <div>
      {/* Toolbar: modo de visualização + itens por página */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
        <div className="inline-flex rounded-md border border-white/10 p-0.5" role="group" aria-label="Modo de visualização">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors duration-150 ${
              viewMode === 'table' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
            Tabela
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            aria-pressed={viewMode === 'cards'}
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors duration-150 ${
              viewMode === 'cards' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Por página</span>
          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={opt.toString()}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {sorted.length === 0 ? (
        emptyState ?? (
          <div className="py-12 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</div>
        )
      ) : viewMode === 'table' ? (
        <table className="w-full table-fixed text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${col.headClassName ?? ''}`}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex cursor-pointer items-center gap-1 transition-colors duration-150 hover:text-foreground"
                    >
                      {col.header}
                      {sortIcon(col.key)}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {pageItems.map((item) => (
              <tr key={getRowId(item)} className="transition-colors duration-150 hover:bg-white/[0.04]">
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 align-middle ${col.cellClassName ?? ''}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={cardGridClassName}>
          {pageItems.map((item) => (
            <React.Fragment key={getRowId(item)}>{renderCard(item)}</React.Fragment>
          ))}
        </div>
      )}

      {/* Paginação */}
      {sorted.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-2.5">
          <span className="on-num text-xs text-muted-foreground">
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="on-num px-2 text-xs text-muted-foreground">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
