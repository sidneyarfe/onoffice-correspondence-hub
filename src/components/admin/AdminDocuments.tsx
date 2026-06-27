import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, FileText, Download, Eye, Trash2, Edit, Paperclip } from 'lucide-react';
import { useAdminDocuments, type AdminDocument } from '@/hooks/useAdminDocuments';
import { supabase } from '@/integrations/supabase/client';
import SimpleDocumentModal from './SimpleDocumentModal';

type SortKey = 'nome' | 'tipo' | 'disponibilidade' | 'arquivo' | 'criado';
interface Sort {
  key: SortKey;
  dir: 'asc' | 'desc';
}

const iconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground';

const AdminDocuments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [dispFilter, setDispFilter] = useState<'all' | 'padrao' | 'sob_demanda'>('all');
  const [sort, setSort] = useState<Sort>({ key: 'criado', dir: 'desc' });
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<AdminDocument | null>(null);
  const { documents, loading, error, refetch, deleteDocument } = useAdminDocuments();
  const { toast } = useToast();

  const tipos = useMemo(() => [...new Set(documents.map((d) => d.tipo))].filter(Boolean).sort(), [documents]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const dir = sort.dir === 'asc' ? 1 : -1;
    return documents
      .filter((d) => {
        const matchesSearch =
          !q || d.nome.toLowerCase().includes(q) || (d.descricao || '').toLowerCase().includes(q) || d.tipo.toLowerCase().includes(q);
        const matchesTipo = tipoFilter === 'all' || d.tipo === tipoFilter;
        const matchesDisp =
          dispFilter === 'all' || (dispFilter === 'padrao' ? d.disponivel_por_padrao : !d.disponivel_por_padrao);
        return matchesSearch && matchesTipo && matchesDisp;
      })
      .sort((a, b) => {
        let av: string | number, bv: string | number;
        switch (sort.key) {
          case 'tipo': av = a.tipo.toLowerCase(); bv = b.tipo.toLowerCase(); break;
          case 'disponibilidade': av = a.disponivel_por_padrao ? 1 : 0; bv = b.disponivel_por_padrao ? 1 : 0; break;
          case 'arquivo': av = a.arquivo_url ? 1 : 0; bv = b.arquivo_url ? 1 : 0; break;
          case 'criado': av = new Date(a.created_at).getTime(); bv = new Date(b.created_at).getTime(); break;
          default: av = a.nome.toLowerCase(); bv = b.nome.toLowerCase();
        }
        return av < bv ? -dir : av > bv ? dir : 0;
      });
  }, [documents, searchTerm, tipoFilter, dispFilter, sort]);

  const hasFilters = searchTerm.trim() !== '' || tipoFilter !== 'all' || dispFilter !== 'all';
  const onSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? '↑' : '↓') : '');

  const fileUrl = (doc: AdminDocument) =>
    doc.arquivo_url ? supabase.storage.from('documentos_fiscais').getPublicUrl(doc.arquivo_url).data?.publicUrl : null;

  const handleView = (doc: AdminDocument) => {
    const url = fileUrl(doc);
    if (url) window.open(url, '_blank');
    else toast({ title: 'Sem arquivo', description: 'Este documento não possui arquivo.', variant: 'destructive' });
  };
  const handleDownload = (doc: AdminDocument) => {
    const url = fileUrl(doc);
    if (!url) {
      toast({ title: 'Sem arquivo', description: 'Este documento não possui arquivo.', variant: 'destructive' });
      return;
    }
    const link = window.document.createElement('a');
    link.href = url;
    link.download = doc.nome;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    try {
      await deleteDocument(id);
      toast({ title: 'Excluído', description: 'Documento excluído com sucesso.' });
    } catch {
      toast({ title: 'Erro', description: 'Erro ao excluir documento.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-on-lime" />
          <p className="text-muted-foreground">Carregando documentos...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-400">{error}</p>
        <Button onClick={refetch}>Tentar Novamente</Button>
      </div>
    );
  }

  const stats = [
    { label: 'Total', value: documents.length, color: 'text-foreground' },
    { label: 'Disponíveis por padrão', value: documents.filter((d) => d.disponivel_por_padrao).length, color: 'text-on-lime' },
    { label: 'Com arquivo', value: documents.filter((d) => d.arquivo_url).length, color: 'text-blue-300' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Documentos Fiscais</h1>
          <p className="mt-1 text-sm text-muted-foreground">Documentos fiscais disponibilizados aos clientes</p>
        </div>
        <Button className="on-button" onClick={() => { setEditingDocument(null); setIsFormModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo documento
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="min-w-[120px] flex-1 rounded-xl border border-white/[0.08] bg-card px-4 py-3">
            <div className={`on-num text-[22px] font-medium leading-none ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Busca + filtros */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            placeholder="Buscar por nome, tipo ou descrição…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 border-white/10 bg-[#0e0e11] pl-9"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="h-10 w-[170px] border-white/10 bg-[#0e0e11]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dispFilter} onValueChange={(v) => setDispFilter(v as typeof dispFilter)}>
          <SelectTrigger className="h-10 w-[180px] border-white/10 bg-[#0e0e11]">
            <SelectValue placeholder="Disponibilidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda disponibilidade</SelectItem>
            <SelectItem value="padrao">Disponível por padrão</SelectItem>
            <SelectItem value="sob_demanda">Sob demanda</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <button
            onClick={() => { setSearchTerm(''); setTipoFilter('all'); setDispFilter('all'); }}
            className="inline-flex h-10 items-center rounded-lg border border-white/10 px-3 text-[13px] text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="text-[13.5px] text-muted-foreground">
        <span className="on-num text-foreground">{filtered.length}</span> de{' '}
        <span className="on-num">{documents.length}</span> documentos
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="bg-[#0e0e11]">
                {([
                  ['Documento', 'nome'],
                  ['Tipo', 'tipo'],
                  ['Disponibilidade', 'disponibilidade'],
                  ['Arquivo', 'arquivo'],
                  ['Criado em', 'criado'],
                ] as [string, SortKey][]).map(([label, key]) => (
                  <th key={key} className="select-none whitespace-nowrap px-4 py-3 text-left">
                    <button
                      onClick={() => onSort(key)}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label} <span className="on-num text-[11px] text-on-lime">{arrow(key)}</span>
                    </button>
                  </th>
                ))}
                <th className="w-[150px] px-4 py-3 text-right text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id} className="border-t border-white/[0.05] transition-colors hover:bg-white/[0.025]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="max-w-[260px] truncate text-[13.5px] font-semibold">{doc.nome}</div>
                        {doc.descricao && (
                          <div className="max-w-[260px] truncate text-[11.5px] text-muted-foreground/80">{doc.descricao}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="on-pill bg-white/[0.06] text-[11px] text-foreground">{doc.tipo}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`on-pill text-[11px] ${doc.disponivel_por_padrao ? 'bg-on-lime/15 text-on-lime' : 'bg-white/[0.07] text-muted-foreground'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${doc.disponivel_por_padrao ? 'bg-on-lime' : 'bg-muted-foreground'}`} />
                      {doc.disponivel_por_padrao ? 'Por padrão' : 'Sob demanda'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {doc.arquivo_url ? (
                      <span className="inline-flex items-center gap-1 text-[12.5px] text-blue-300">
                        <Paperclip className="h-3.5 w-3.5" /> Anexado
                      </span>
                    ) : (
                      <span className="text-[12.5px] text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="on-num text-[12.5px] text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button className={iconBtn} title="Editar" onClick={() => { setEditingDocument(doc); setIsFormModalOpen(true); }}>
                        <Edit className="h-[15px] w-[15px]" />
                      </button>
                      {doc.arquivo_url && (
                        <>
                          <button className={iconBtn} title="Ver" onClick={() => handleView(doc)}>
                            <Eye className="h-[15px] w-[15px]" />
                          </button>
                          <button className={`${iconBtn} hover:border-on-lime/50 hover:text-on-lime`} title="Baixar" onClick={() => handleDownload(doc)}>
                            <Download className="h-[15px] w-[15px]" />
                          </button>
                        </>
                      )}
                      <button className={`${iconBtn} hover:border-red-500/50 hover:text-red-300`} title="Excluir" onClick={() => handleDelete(doc.id)}>
                        <Trash2 className="h-[15px] w-[15px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-muted-foreground">
            {hasFilters
              ? 'Nenhum documento com esses filtros. Tente limpar a busca.'
              : 'Nenhum documento cadastrado. Crie o primeiro pelo botão "Novo documento".'}
          </div>
        )}
      </div>

      {/* Modal */}
      <SimpleDocumentModal
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setEditingDocument(null); }}
        document={editingDocument}
        onSuccess={() => { refetch(); setIsFormModalOpen(false); setEditingDocument(null); }}
      />
    </div>
  );
};

export default AdminDocuments;
