import { useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProducts, type Produto, type Plano } from '@/hooks/useProducts';
import { ProductFormModal } from './ProductFormModal';
import PlanFormModal from './PlanFormModal';
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

export function AdminProducts() {
  const { produtos, planos, loading, updateProduto, updatePlano, deletePlano } = useProducts();
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plano | null>(null);

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(priceInCents / 100);
  };

  const handleToggleProductStatus = async (produto: Produto) => {
    await updateProduto(produto.id, { ativo: !produto.ativo });
  };

  const handleTogglePlanStatus = async (plano: Plano) => {
    await updatePlano(plano.id, { ativo: !plano.ativo });
  };

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Produtos e Serviços</h1>
          <p className="text-muted-foreground">Gerencie os produtos e planos disponíveis para contratação</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowProductModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
          <Button onClick={() => setShowPlanModal(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Produtos */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Produtos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {produtos.map((produto) => (
            <Card key={produto.id} className={!produto.ativo ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{produto.nome_produto}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={produto.ativo ? 'default' : 'secondary'}>
                      {produto.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleProductStatus(produto)}
                    >
                      {produto.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditProduct(produto)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{produto.descricao}</p>
                <div className="mt-3 text-xs text-muted-foreground">
                  {planos.filter(p => p.produto_id === produto.id).length} plano(s)
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Planos */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Planos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {planos.map((plano) => (
            <Card key={plano.id} className={!plano.ativo ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{plano.nome_plano}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {plano.produtos?.nome_produto}
                    </p>
                  </div>
                   <div className="flex items-center gap-2">
                     {plano.popular && <Badge variant="default">Popular</Badge>}
                     <Badge variant={plano.ativo ? 'default' : 'secondary'}>
                       {plano.ativo ? 'Ativo' : 'Inativo'}
                     </Badge>
                     <Badge variant={plano.listado_publicamente ? 'outline' : 'destructive'}>
                       {plano.listado_publicamente ? 'Listado' : 'Não Listado'}
                     </Badge>
                   </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(plano.preco_em_centavos)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {plano.descricao}
                  </p>
                  
                  {plano.entregaveis && plano.entregaveis.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1">Entregáveis:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {plano.entregaveis.slice(0, 3).map((item, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
                            {item}
                          </li>
                        ))}
                        {plano.entregaveis.length > 3 && (
                          <li className="text-xs text-muted-foreground">
                            +{plano.entregaveis.length - 3} mais...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTogglePlanStatus(plano)}
                      >
                        {plano.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditPlan(plano)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o plano "{plano.nome_plano}"? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePlano(plano.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ordem: {plano.ordem_exibicao}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modals */}
      <ProductFormModal
        open={showProductModal}
        onClose={handleCloseModals}
        product={editingProduct}
      />
      <PlanFormModal
        open={showPlanModal}
        onClose={handleCloseModals}
        plan={editingPlan}
      />
    </div>
  );
}