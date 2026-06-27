import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Package, Repeat, ShoppingCart, Search, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProducts, type Produto, type Plano } from '@/hooks/useProducts';
import { ProductFormModal } from './ProductFormModal';
import PlanFormModal from './PlanFormModal';
import { formatCurrency } from '@/utils/formatters';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Dir = 'asc' | 'desc';
interface Sort<K extends string> {
  key: K;
  dir: Dir;
}
type ProdKey = 'nome' | 'tipo' | 'ofertas' | 'status';
type OfertaKey = 'nome' | 'produto' | 'tipo' | 'preco' | 'recorrencia' | 'vitrine' | 'status';

const tipoLabel = (tipo?: string) => (tipo === 'avulso' ? 'Avulso' : 'Assinatura');

const TipoPill = ({ tipo }: { tipo?: string }) => {
  const avulso = tipo === 'avulso';
  return (
    <span className={`on-pill whitespace-nowrap text-[11px] ${avulso ? 'bg-indigo-400/15 text-indigo-300' : 'bg-on-lime/15 text-on-lime'}`}>
      {avulso ? <ShoppingCart className="h-2.5 w-2.5" /> : <Repeat className="h-2.5 w-2.5" />}
      {tipoLabel(tipo)}
    </span>
  );
};

const StatusPill = ({ ativo, on = 'Ativo', off = 'Inativo' }: { ativo: boolean; on?: string; off?: string }) => (
  <span className={`on-pill whitespace-nowrap text-[11px] ${ativo ? 'bg-on-lime/15 text-on-lime' : 'bg-white/[0.07] text-muted-foreground'}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${ativo ? 'bg-on-lime' : 'bg-muted-foreground'}`} />
    {ativo ? on : off}
  </span>
);

function SortTh<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: K;
  sort: Sort<K>;
  onSort: (k: K) => void;
  className?: string;
}) {
  return (
    <th className={`select-none whitespace-nowrap px-4 py-3 text-left ${className}`}>
      <button
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
        <span className="on-num text-[11px] text-on-lime">{sort.key === sortKey ? (sort.dir === 'asc' ? '↑' : '↓') : ''}</span>
      </button>
    </th>
  );
}

const iconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground';
const selectCls =
  'h-10 rounded-lg border border-white/10 bg-[#0e0e11] px-3 text-[13px] text-foreground outline-none transition-colors focus:border-on-lime/50';

export function AdminProducts() {
  const { produtos, planos, loading, updateProduto, updatePlano, deletePlano } = useProducts();

  const [showProductModal, setShowProductModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plano | null>(null);

  const [q, setQ] = useState('');
  const [fTipo, setFTipo] = useState<'all' | 'assinatura' | 'avulso'>('all');
  const [fStatus, setFStatus] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [sortProd, setSortProd] = useState<Sort<ProdKey>>({ key: 'nome', dir: 'asc' });
  const [sortOf, setSortOf] = useState<Sort<OfertaKey>>({ key: 'nome', dir: 'asc' });

  const tipoDe = useMemo(() => {
    const map = new Map(produtos.map((p) => [p.id, p.tipo]));
    return (produtoId: string) => map.get(produtoId);
  }, [produtos]);

  const hasFilters = q.trim() !== '' || fTipo !== 'all' || fStatus !== 'all';
  const matchTipo = (tipo?: string) => fTipo === 'all' || (fTipo === 'avulso' ? tipo === 'avulso' : tipo !== 'avulso');
  const matchStatus = (ativo: boolean) => fStatus === 'all' || (fStatus === 'ativo' ? ativo : !ativo);
  const matchQ = (s: string) => !q.trim() || s.toLowerCase().includes(q.trim().toLowerCase());

  const ofertasCount = useMemo(() => {
    const m = new Map<string, number>();
    planos.forEach((p) => m.set(p.produto_id, (m.get(p.produto_id) || 0) + 1));
    return m;
  }, [planos]);

  const stats = useMemo(
    () => ({
      produtos: produtos.length,
      assinaturas: produtos.filter((p) => p.tipo !== 'avulso').length,
      avulsos: produtos.filter((p) => p.tipo === 'avulso').length,
      ofertasAtivas: planos.filter((p) => p.ativo).length,
    }),
    [produtos, planos],
  );

  const produtosView = useMemo(() => {
    const dir = sortProd.dir === 'asc' ? 1 : -1;
    return produtos
      .filter((p) => matchTipo(p.tipo) && matchStatus(p.ativo) && matchQ(`${p.nome_produto} ${p.descricao || ''}`))
      .sort((a, b) => {
        let av: string | number, bv: string | number;
        switch (sortProd.key) {
          case 'tipo': av = a.tipo; bv = b.tipo; break;
          case 'ofertas': av = ofertasCount.get(a.id) || 0; bv = ofertasCount.get(b.id) || 0; break;
          case 'status': av = a.ativo ? 1 : 0; bv = b.ativo ? 1 : 0; break;
          default: av = a.nome_produto.toLowerCase(); bv = b.nome_produto.toLowerCase();
        }
        return av < bv ? -dir : av > bv ? dir : 0;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtos, q, fTipo, fStatus, sortProd, ofertasCount]);

  const ofertasView = useMemo(() => {
    const dir = sortOf.dir === 'asc' ? 1 : -1;
    return planos
      .filter((p) => matchTipo(tipoDe(p.produto_id)) && matchStatus(p.ativo) && matchQ(`${p.nome_plano} ${p.produtos?.nome_produto || ''}`))
      .sort((a, b) => {
        let av: string | number, bv: string | number;
        switch (sortOf.key) {
          case 'produto': av = (a.produtos?.nome_produto || '').toLowerCase(); bv = (b.produtos?.nome_produto || '').toLowerCase(); break;
          case 'tipo': av = tipoDe(a.produto_id) || ''; bv = tipoDe(b.produto_id) || ''; break;
          case 'preco': av = a.preco_em_centavos; bv = b.preco_em_centavos; break;
          case 'recorrencia': av = a.periodicidade || a.unidade || ''; bv = b.periodicidade || b.unidade || ''; break;
          case 'vitrine': av = a.listado_publicamente ? 1 : 0; bv = b.listado_publicamente ? 1 : 0; break;
          case 'status': av = a.ativo ? 1 : 0; bv = b.ativo ? 1 : 0; break;
          default: av = a.nome_plano.toLowerCase(); bv = b.nome_plano.toLowerCase();
        }
        return av < bv ? -dir : av > bv ? dir : 0;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planos, q, fTipo, fStatus, sortOf, tipoDe]);

  const sortProdBy = (k: ProdKey) => setSortProd((s) => ({ key: k, dir: s.key === k && s.dir === 'asc' ? 'desc' : 'asc' }));
  const sortOfBy = (k: OfertaKey) => setSortOf((s) => ({ key: k, dir: s.key === k && s.dir === 'asc' ? 'desc' : 'asc' }));

  const handleEditProduct = (produto: Produto) => { setEditingProduct(produto); setShowProductModal(true); };
  const handleEditPlan = (plano: Plano) => { setEditingPlan(plano); setShowPlanModal(true); };
  const handleCloseModals = () => { setShowProductModal(false); setShowPlanModal(false); setEditingProduct(null); setEditingPlan(null); };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-on-lime" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Produtos e Serviços</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de <b className="text-foreground">assinaturas</b> (recorrentes) e{' '}
            <b className="text-foreground">avulsos</b> (venda única, ex.: horas de sala)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowProductModal(true)} className="on-button">
            <Plus className="mr-2 h-4 w-4" /> Novo produto
          </Button>
          <Button onClick={() => setShowPlanModal(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Nova oferta
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2.5">
        {[
          { label: 'Produtos', value: stats.produtos, color: 'text-foreground' },
          { label: 'Assinaturas', value: stats.assinaturas, color: 'text-on-lime' },
          { label: 'Avulsos', value: stats.avulsos, color: 'text-indigo-300' },
          { label: 'Ofertas ativas', value: stats.ofertasAtivas, color: 'text-foreground' },
        ].map((s) => (
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
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por produto ou oferta…"
            className="h-10 w-full rounded-lg border border-white/10 bg-[#0e0e11] pl-9 pr-3.5 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-on-lime/50"
          />
        </div>
        <select value={fTipo} onChange={(e) => setFTipo(e.target.value as typeof fTipo)} className={selectCls}>
          <option value="all">Todos os tipos</option>
          <option value="assinatura">Assinatura</option>
          <option value="avulso">Avulso</option>
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)} className={selectCls}>
          <option value="all">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setQ(''); setFTipo('all'); setFStatus('all'); }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[13px] text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
          >
            <X className="h-[14px] w-[14px]" /> Limpar
          </button>
        )}
      </div>

      {/* Produtos */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Package className="h-[18px] w-[18px] text-muted-foreground" />
          <h2 className="text-lg font-bold">Produtos</h2>
          <span className="text-sm text-muted-foreground">— famílias que definem o tipo (assinatura/avulso)</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr className="bg-[#0e0e11]">
                  <SortTh label="Produto" sortKey="nome" sort={sortProd} onSort={sortProdBy} />
                  <SortTh label="Tipo" sortKey="tipo" sort={sortProd} onSort={sortProdBy} />
                  <th className="px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Descrição</th>
                  <SortTh label="Ofertas" sortKey="ofertas" sort={sortProd} onSort={sortProdBy} className="text-center" />
                  <SortTh label="Status" sortKey="status" sort={sortProd} onSort={sortProdBy} />
                  <th className="w-[88px] px-4 py-3 text-right text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosView.map((produto) => (
                  <tr key={produto.id} className="border-t border-white/[0.05] transition-colors hover:bg-white/[0.025]">
                    <td className="px-4 py-2.5 text-[13.5px] font-semibold">{produto.nome_produto}</td>
                    <td className="px-4 py-2.5"><TipoPill tipo={produto.tipo} /></td>
                    <td className="px-4 py-2.5"><div className="max-w-[280px] truncate text-[12.5px] text-muted-foreground">{produto.descricao || '—'}</div></td>
                    <td className="px-4 py-2.5 text-center"><span className="on-num text-[13px] text-muted-foreground">{ofertasCount.get(produto.id) || 0}</span></td>
                    <td className="px-4 py-2.5"><StatusPill ativo={produto.ativo} /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button className={iconBtn} title={produto.ativo ? 'Desativar' : 'Ativar'} onClick={() => updateProduto(produto.id, { ativo: !produto.ativo })}>
                          {produto.ativo ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
                        </button>
                        <button className={iconBtn} title="Editar" onClick={() => handleEditProduct(produto)}><Pencil className="h-[15px] w-[15px]" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {produtosView.length === 0 && (
            <div className="px-5 py-10 text-center text-muted-foreground">
              {hasFilters ? 'Nenhum produto com esses filtros. Tente limpar a busca.' : 'Nenhum produto cadastrado.'}
            </div>
          )}
        </div>
      </section>

      {/* Ofertas */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Repeat className="h-[18px] w-[18px] text-muted-foreground" />
          <h2 className="text-lg font-bold">Ofertas</h2>
          <span className="text-sm text-muted-foreground">— preços de cada produto (plano recorrente ou item avulso)</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="bg-[#0e0e11]">
                  <SortTh label="Oferta" sortKey="nome" sort={sortOf} onSort={sortOfBy} />
                  <SortTh label="Produto" sortKey="produto" sort={sortOf} onSort={sortOfBy} />
                  <SortTh label="Tipo" sortKey="tipo" sort={sortOf} onSort={sortOfBy} />
                  <SortTh label="Preço" sortKey="preco" sort={sortOf} onSort={sortOfBy} className="text-right" />
                  <SortTh label="Recorrência / Unidade" sortKey="recorrencia" sort={sortOf} onSort={sortOfBy} />
                  <SortTh label="Vitrine" sortKey="vitrine" sort={sortOf} onSort={sortOfBy} />
                  <SortTh label="Status" sortKey="status" sort={sortOf} onSort={sortOfBy} />
                  <th className="w-[120px] px-4 py-3 text-right text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ofertasView.map((plano) => {
                  const tipo = tipoDe(plano.produto_id);
                  const avulso = tipo === 'avulso';
                  return (
                    <tr key={plano.id} className="border-t border-white/[0.05] transition-colors hover:bg-white/[0.025]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {plano.imagem_capa_url ? (
                            <img src={plano.imagem_capa_url} alt="" className="h-8 w-8 shrink-0 rounded-md border border-white/10 object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-muted-foreground/50">
                              <ImageIcon className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="max-w-[180px] truncate text-[13.5px] font-semibold">{plano.nome_plano}</span>
                            {plano.popular && <span className="on-pill bg-on-lime/15 text-[10px] text-on-lime">Popular</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><span className="text-[12.5px] text-muted-foreground">{plano.produtos?.nome_produto || '—'}</span></td>
                      <td className="px-4 py-2.5"><TipoPill tipo={tipo} /></td>
                      <td className="px-4 py-2.5 text-right"><span className="on-num text-[13.5px] font-semibold text-on-lime">{formatCurrency(plano.preco_em_centavos)}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[12.5px] text-muted-foreground">{avulso ? `por ${plano.unidade || 'unidade'}` : plano.periodicidade || '—'}</span></td>
                      <td className="px-4 py-2.5"><StatusPill ativo={plano.listado_publicamente} on="Listado" off="Oculto" /></td>
                      <td className="px-4 py-2.5"><StatusPill ativo={plano.ativo} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className={iconBtn} title={plano.ativo ? 'Desativar' : 'Ativar'} onClick={() => updatePlano(plano.id, { ativo: !plano.ativo })}>
                            {plano.ativo ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
                          </button>
                          <button className={iconBtn} title="Editar" onClick={() => handleEditPlan(plano)}><Pencil className="h-[15px] w-[15px]" /></button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className={`${iconBtn} hover:border-red-500/50 hover:text-red-300`} title="Excluir"><Trash2 className="h-[15px] w-[15px]" /></button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir oferta</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja excluir "{plano.nome_plano}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePlano(plano.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ofertasView.length === 0 && (
            <div className="px-5 py-10 text-center text-muted-foreground">
              {hasFilters ? 'Nenhuma oferta com esses filtros. Tente limpar a busca.' : 'Nenhuma oferta cadastrada.'}
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      <ProductFormModal open={showProductModal} onClose={handleCloseModals} product={editingProduct} />
      <PlanFormModal open={showPlanModal} onClose={handleCloseModals} plan={editingPlan} />
    </div>
  );
}
