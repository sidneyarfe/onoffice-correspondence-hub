import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Package, Repeat, ShoppingCart } from 'lucide-react';
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

const tipoLabel = (tipo?: string) => (tipo === 'avulso' ? 'Avulso' : 'Assinatura');

const TipoPill = ({ tipo }: { tipo?: string }) => {
  const avulso = tipo === 'avulso';
  return (
    <span
      className={`on-pill whitespace-nowrap text-[11px] ${
        avulso ? 'bg-indigo-400/15 text-indigo-300' : 'bg-on-lime/15 text-on-lime'
      }`}
    >
      {avulso ? <ShoppingCart className="h-2.5 w-2.5" /> : <Repeat className="h-2.5 w-2.5" />}
      {tipoLabel(tipo)}
    </span>
  );
};

const StatusPill = ({ ativo, on = 'Ativo', off = 'Inativo' }: { ativo: boolean; on?: string; off?: string }) => (
  <span
    className={`on-pill whitespace-nowrap text-[11px] ${
      ativo ? 'bg-on-lime/15 text-on-lime' : 'bg-white/[0.07] text-muted-foreground'
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${ativo ? 'bg-on-lime' : 'bg-muted-foreground'}`} />
    {ativo ? on : off}
  </span>
);

const Th = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
  <th className={`whitespace-nowrap px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground ${className}`}>
    {children}
  </th>
);

const iconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground';

export function AdminProducts() {
  const { produtos, planos, loading, updateProduto, updatePlano, deletePlano } = useProducts();

  const [showProductModal, setShowProductModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plano | null>(null);

  const tipoDe = useMemo(() => {
    const map = new Map(produtos.map((p) => [p.id, p.tipo]));
    return (produtoId: string) => map.get(produtoId);
  }, [produtos]);

  const stats = useMemo(
    () => ({
      produtos: produtos.length,
      assinaturas: produtos.filter((p) => p.tipo !== 'avulso').length,
      avulsos: produtos.filter((p) => p.tipo === 'avulso').length,
      ofertasAtivas: planos.filter((p) => p.ativo).length,
    }),
    [produtos, planos],
  );

  const handleEditProduct = (produto: Produto) => {
    setEditingProduct(produto);
    setShowProductModal(true);
  };
  const handleEditPlan = (plano: Plano) => {
    setEditingPlan(plano);
    setShowPlanModal(true);
  };
  const handleCloseModals = () => {
    setShowProductModal(false);
    setShowPlanModal(false);
    setEditingProduct(null);
    setEditingPlan(null);
  };

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

      {/* Produtos (famílias) */}
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
                  <Th>Produto</Th>
                  <Th>Tipo</Th>
                  <Th>Descrição</Th>
                  <Th className="text-center">Ofertas</Th>
                  <Th>Status</Th>
                  <Th className="w-[88px] text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((produto) => {
                  const nOfertas = planos.filter((p) => p.produto_id === produto.id).length;
                  return (
                    <tr key={produto.id} className="border-t border-white/[0.05] transition-colors hover:bg-white/[0.025]">
                      <td className="px-4 py-2.5 text-[13.5px] font-semibold">{produto.nome_produto}</td>
                      <td className="px-4 py-2.5">
                        <TipoPill tipo={produto.tipo} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="max-w-[280px] truncate text-[12.5px] text-muted-foreground">
                          {produto.descricao || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="on-num text-[13px] text-muted-foreground">{nOfertas}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill ativo={produto.ativo} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className={iconBtn}
                            title={produto.ativo ? 'Desativar' : 'Ativar'}
                            onClick={() => updateProduto(produto.id, { ativo: !produto.ativo })}
                          >
                            {produto.ativo ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
                          </button>
                          <button className={iconBtn} title="Editar" onClick={() => handleEditProduct(produto)}>
                            <Pencil className="h-[15px] w-[15px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {produtos.length === 0 && (
            <div className="px-5 py-10 text-center text-muted-foreground">Nenhum produto cadastrado.</div>
          )}
        </div>
      </section>

      {/* Ofertas (preços por produto) */}
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
                  <Th>Oferta</Th>
                  <Th>Produto</Th>
                  <Th>Tipo</Th>
                  <Th className="text-right">Preço</Th>
                  <Th>Recorrência / Unidade</Th>
                  <Th>Vitrine</Th>
                  <Th>Status</Th>
                  <Th className="w-[120px] text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {planos.map((plano) => {
                  const tipo = tipoDe(plano.produto_id);
                  const avulso = tipo === 'avulso';
                  return (
                    <tr key={plano.id} className="border-t border-white/[0.05] transition-colors hover:bg-white/[0.025]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="max-w-[200px] truncate text-[13.5px] font-semibold">{plano.nome_plano}</span>
                          {plano.popular && (
                            <span className="on-pill bg-on-lime/15 text-[10px] text-on-lime">Popular</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[12.5px] text-muted-foreground">{plano.produtos?.nome_produto || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <TipoPill tipo={tipo} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="on-num text-[13.5px] font-semibold text-on-lime">
                          {formatCurrency(plano.preco_em_centavos)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[12.5px] text-muted-foreground">
                          {avulso ? `por ${plano.unidade || 'unidade'}` : plano.periodicidade || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill ativo={plano.listado_publicamente} on="Listado" off="Oculto" />
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill ativo={plano.ativo} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className={iconBtn}
                            title={plano.ativo ? 'Desativar' : 'Ativar'}
                            onClick={() => updatePlano(plano.id, { ativo: !plano.ativo })}
                          >
                            {plano.ativo ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
                          </button>
                          <button className={iconBtn} title="Editar" onClick={() => handleEditPlan(plano)}>
                            <Pencil className="h-[15px] w-[15px]" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className={`${iconBtn} hover:border-red-500/50 hover:text-red-300`} title="Excluir">
                                <Trash2 className="h-[15px] w-[15px]" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir oferta</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir "{plano.nome_plano}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
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
          {planos.length === 0 && (
            <div className="px-5 py-10 text-center text-muted-foreground">Nenhuma oferta cadastrada.</div>
          )}
        </div>
      </section>

      {/* Modals */}
      <ProductFormModal open={showProductModal} onClose={handleCloseModals} product={editingProduct} />
      <PlanFormModal open={showPlanModal} onClose={handleCloseModals} plan={editingPlan} />
    </div>
  );
}
