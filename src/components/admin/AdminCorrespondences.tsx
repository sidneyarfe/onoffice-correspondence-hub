import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Upload, Eye, Download, Mail, Edit, Settings, Paperclip } from 'lucide-react';
import { useAdminCorrespondences, AdminCorrespondence } from '@/hooks/useAdminCorrespondences';
import { useCorrespondenceCategories } from '@/hooks/useCorrespondenceCategories';
import CorrespondenceDetailModal from './CorrespondenceDetailModal';
import NewCorrespondenceModal from './NewCorrespondenceModal';
import EditCorrespondenceModal from './EditCorrespondenceModal';
import CategoryManagementModal from './CategoryManagementModal';

type SortKey = 'assunto' | 'cliente' | 'categoria' | 'data' | 'status';
interface Sort {
  key: SortKey;
  dir: 'asc' | 'desc';
}

const iconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground';

const AdminCorrespondences = () => {
  const { correspondences, loading, error, refetch, updateCorrespondenceStatus, deleteCorrespondence } =
    useAdminCorrespondences();
  const { categories } = useCorrespondenceCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState<Sort>({ key: 'data', dir: 'desc' });

  const [selectedCorrespondence, setSelectedCorrespondence] = useState<AdminCorrespondence | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCorrespondence, setEditingCorrespondence] = useState<AdminCorrespondence | null>(null);

  const corColor = (nome: string) => categories.find((c) => c.nome === nome)?.cor || '#6b7280';

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const dir = sort.dir === 'asc' ? 1 : -1;
    return correspondences
      .filter((c) => {
        const matchesSearch =
          !q ||
          c.cliente_nome.toLowerCase().includes(q) ||
          c.remetente.toLowerCase().includes(q) ||
          c.assunto.toLowerCase().includes(q);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'viewed' && c.visualizada) ||
          (statusFilter === 'new' && !c.visualizada);
        const matchesCategory = categoryFilter === 'all' || c.categoria === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        let av: string | number, bv: string | number;
        switch (sort.key) {
          case 'cliente': av = a.cliente_nome.toLowerCase(); bv = b.cliente_nome.toLowerCase(); break;
          case 'categoria': av = a.categoria.toLowerCase(); bv = b.categoria.toLowerCase(); break;
          case 'data': av = new Date(a.data_recebimento).getTime(); bv = new Date(b.data_recebimento).getTime(); break;
          case 'status': av = a.visualizada ? 1 : 0; bv = b.visualizada ? 1 : 0; break;
          default: av = a.assunto.toLowerCase(); bv = b.assunto.toLowerCase();
        }
        return av < bv ? -dir : av > bv ? dir : 0;
      });
  }, [correspondences, searchTerm, statusFilter, categoryFilter, sort]);

  const hasFilters = searchTerm.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all';
  const onSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? '↑' : '↓') : '');

  const handleDownload = (c: AdminCorrespondence) => {
    if (c.arquivo_url) window.open(c.arquivo_url, '_blank');
  };
  const handleUpdateStatus = async (id: string, visualizada: boolean) => {
    await updateCorrespondenceStatus(id, visualizada);
    if (selectedCorrespondence?.id === id) setSelectedCorrespondence((prev) => (prev ? { ...prev, visualizada } : null));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-on-lime" />
          <p className="text-muted-foreground">Carregando correspondências...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-400">Erro ao carregar correspondências: {error}</p>
        <Button onClick={refetch}>Tentar Novamente</Button>
      </div>
    );
  }

  const stats = [
    { label: 'Total', value: correspondences.length, color: 'text-foreground' },
    { label: 'Novas', value: correspondences.filter((c) => !c.visualizada).length, color: 'text-blue-300' },
    { label: 'Visualizadas', value: correspondences.filter((c) => c.visualizada).length, color: 'text-on-lime' },
    { label: 'Com anexo', value: correspondences.filter((c) => c.arquivo_url).length, color: 'text-purple-300' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Correspondências</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestão de todas as correspondências recebidas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowCategoryModal(true)}>
            <Settings className="mr-2 h-4 w-4" /> Categorias
          </Button>
          <Button onClick={() => setShowNewModal(true)} className="on-button">
            <Upload className="mr-2 h-4 w-4" /> Nova correspondência
          </Button>
        </div>
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
            placeholder="Buscar por cliente, remetente ou assunto…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 border-white/10 bg-[#0e0e11] pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-[150px] border-white/10 bg-[#0e0e11]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="new">Novas</SelectItem>
            <SelectItem value="viewed">Visualizadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-10 w-[170px] border-white/10 bg-[#0e0e11]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.nome}>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.cor }} />
                  {category.nome}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); }}
            className="inline-flex h-10 items-center rounded-lg border border-white/10 px-3 text-[13px] text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="text-[13.5px] text-muted-foreground">
        <span className="on-num text-foreground">{filtered.length}</span> de{' '}
        <span className="on-num">{correspondences.length}</span> correspondências
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr className="bg-[#0e0e11]">
                {([
                  ['Correspondência', 'assunto'],
                  ['Cliente', 'cliente'],
                  ['Categoria', 'categoria'],
                  ['Recebida', 'data'],
                  ['Status', 'status'],
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
                <th className="w-[120px] px-4 py-3 text-right text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => { setSelectedCorrespondence(c); setShowDetailModal(true); }}
                  className="cursor-pointer border-t border-white/[0.05] transition-colors hover:bg-white/[0.025]"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="max-w-[230px] truncate text-[13.5px] font-semibold">{c.assunto}</span>
                          {c.arquivo_url && <Paperclip className="h-3 w-3 shrink-0 text-purple-300" />}
                        </div>
                        <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground/80">De: {c.remetente}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="max-w-[180px] truncate text-[13px]">{c.cliente_nome}</div>
                    <div className="truncate text-[11.5px] text-muted-foreground/80">{c.cliente_email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="on-pill bg-white/[0.06] text-[11px] text-foreground">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: corColor(c.categoria) }} />
                      {c.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="on-num text-[12.5px] text-muted-foreground">
                      {new Date(c.data_recebimento).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`on-pill text-[11px] ${c.visualizada ? 'bg-white/[0.06] text-muted-foreground' : 'bg-blue-500/15 text-blue-300'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${c.visualizada ? 'bg-muted-foreground' : 'bg-blue-400'}`} />
                      {c.visualizada ? 'Visualizada' : 'Nova'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button className={iconBtn} title="Editar" onClick={() => { setEditingCorrespondence(c); setShowEditModal(true); }}>
                        <Edit className="h-[15px] w-[15px]" />
                      </button>
                      <button className={iconBtn} title="Visualizar" onClick={() => { setSelectedCorrespondence(c); setShowDetailModal(true); }}>
                        <Eye className="h-[15px] w-[15px]" />
                      </button>
                      {c.arquivo_url && (
                        <button className={`${iconBtn} hover:border-on-lime/50 hover:text-on-lime`} title="Baixar anexo" onClick={() => handleDownload(c)}>
                          <Download className="h-[15px] w-[15px]" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-muted-foreground">
            {hasFilters ? 'Nenhuma correspondência com esses filtros. Tente limpar a busca.' : 'Nenhuma correspondência registrada.'}
          </div>
        )}
      </div>

      {/* Modais */}
      <CorrespondenceDetailModal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedCorrespondence(null); }}
        correspondence={selectedCorrespondence}
        onUpdateStatus={handleUpdateStatus}
        onDelete={deleteCorrespondence}
        onEdit={(c) => {
          setShowDetailModal(false);
          setSelectedCorrespondence(null);
          setEditingCorrespondence(c);
          setShowEditModal(true);
        }}
      />
      <NewCorrespondenceModal isOpen={showNewModal} onClose={() => setShowNewModal(false)} onSuccess={refetch} />
      <EditCorrespondenceModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingCorrespondence(null); }}
        correspondence={editingCorrespondence}
        onSuccess={() => { refetch(); setEditingCorrespondence(null); }}
      />
      <CategoryManagementModal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} />
    </div>
  );
};

export default AdminCorrespondences;
