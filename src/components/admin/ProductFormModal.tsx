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
import { useProducts, type Produto } from '@/hooks/useProducts';

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
  });

  useEffect(() => {
    if (product) {
      setFormData({
        nome_produto: product.nome_produto,
        descricao: product.descricao || '',
        ativo: product.ativo,
      });
    } else {
      setFormData({
        nome_produto: '',
        descricao: '',
        ativo: true,
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
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva o produto ou serviço..."
              rows={3}
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