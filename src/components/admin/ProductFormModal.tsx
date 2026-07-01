import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useProducts, type Produto, type ProdutoTipo } from '@/hooks/useProducts';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: Produto | null;
}

export function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const { createProduto, updateProduto, loading } = useProducts();
  
  const [formData, setFormData] = useState({
    nome_produto: '',
    descricao: '',
    ativo: true,
    tipo: 'assinatura' as ProdutoTipo,
    exige_contrato: false,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        nome_produto: product.nome_produto,
        descricao: product.descricao || '',
        ativo: product.ativo,
        tipo: product.tipo || 'assinatura',
        exige_contrato: product.exige_contrato ?? false,
      });
    } else {
      setFormData({
        nome_produto: '',
        descricao: '',
        ativo: true,
        tipo: 'assinatura',
        exige_contrato: false,
      });
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (product) {
        await updateProduto(product.id, formData);
      } else {
        await createProduto(formData);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_produto">Nome do Produto *</Label>
            <Input
              id="nome_produto"
              value={formData.nome_produto}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_produto: e.target.value }))}
              placeholder="Ex: Endereço Fiscal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de produto *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['assinatura', 'avulso'] as ProdutoTipo[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tipo: t }))}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    formData.tipo === t
                      ? 'border-on-lime bg-on-lime/10 text-on-lime'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  {t === 'assinatura' ? 'Assinatura (recorrente)' : 'Avulso (venda única)'}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.tipo === 'assinatura'
                ? 'Cobrado por ciclo (mensal, anual…). Os planos usam periodicidade.'
                : 'Venda única — ex.: horas de sala. Os planos usam unidade + quantidade.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva o produto ou serviço..."
              rows={3}
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border border-input p-3">
            <div className="space-y-0.5">
              <Label htmlFor="exige_contrato">Com contrato</Label>
              <p className="text-xs text-muted-foreground">
                Exige assinatura de contrato (ZapSign). As ofertas deste produto pedem os templates PF/PJ.
              </p>
            </div>
            <Switch
              id="exige_contrato"
              checked={formData.exige_contrato}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, exige_contrato: checked }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
            />
            <Label htmlFor="ativo">Produto ativo</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}