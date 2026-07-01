import React from 'react';
import { Download, Upload, Plus, List, Columns3 } from 'lucide-react';

interface ClientesToolbarProps {
  totalCount: number;
  view: 'lista' | 'kanban';
  onViewChange: (v: 'lista' | 'kanban') => void;
  onExport: () => void;
  onImport: () => void;
  onAdd: () => void;
}

const ClientesToolbar: React.FC<ClientesToolbarProps> = ({
  totalCount,
  view,
  onViewChange,
  onExport,
  onImport,
  onAdd,
}) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">Clientes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gestão de contratações · <span className="on-num text-foreground">{totalCount}</span> registros
      </p>
    </div>
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="inline-flex rounded-xl border border-white/10 bg-[#0e0e11] p-[3px]">
        {(['lista', 'kanban'] as const).map((v) => {
          const active = view === v;
          const Icon = v === 'lista' ? List : Columns3;
          return (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                active ? 'bg-on-lime font-semibold text-on-black' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-[15px] w-[15px]" />
              {v === 'lista' ? 'Lista' : 'Kanban'}
            </button>
          );
        })}
      </div>
      <button
        onClick={onExport}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-white/25"
      >
        <Download className="h-[15px] w-[15px]" /> Exportar
      </button>
      <button
        onClick={onImport}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-white/25"
      >
        <Upload className="h-[15px] w-[15px]" /> Importar
      </button>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-lg bg-on-lime px-4 py-2 text-[13px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)]"
      >
        <Plus className="h-4 w-4" /> Adicionar
      </button>
    </div>
  </div>
);

export default ClientesToolbar;
