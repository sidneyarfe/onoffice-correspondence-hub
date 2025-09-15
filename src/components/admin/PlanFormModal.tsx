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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { useProducts, type Plano } from '@/hooks/useProducts';

interface PlanFormModalProps {
  open: boolean;
  onClose: () => void;
  plan?: Plano | null;
}

export function PlanFormModal({ open, onClose, plan }: PlanFormModalProps) {
  const { produtos, createPlano, updatePlano, loading } = useProducts();
  
  const [formData, setFormData] = useState({
    produto_id: '',
    nome_plano: '',
    descricao: '',
    entregaveis: [] as string[],
    preco_em_centavos: 0,
    zapsign_template_id_pf: '',
    zapsign_template_id_pj: '',
    pagarme_plan_id: '',
    ativo: true,
    ordem_exibicao: 0,
    popular: false,
  });

  const [newEntregavel, setNewEntregavel] = useState('');
  const [precoFormatted, setPrecoFormatted] = useState('');

  useEffect(() => {
    if (plan) {
      setFormData({
        produto_id: plan.produto_id,
        nome_plano: plan.nome_plano,
        descricao: plan.descricao || '',
        entregaveis: plan.entregaveis || [],
        preco_em_centavos: plan.preco_em_centavos,
        zapsign_template_id_pf: plan.zapsign_template_id_pf || '',
        zapsign_template_id_pj: plan.zapsign_template_id_pj || '',
        pagarme_plan_id: plan.pagarme_plan_id || '',
        ativo: plan.ativo,
        ordem_exibicao: plan.ordem_exibicao,
        popular: plan.popular,
      });
      setPrecoFormatted((plan.preco_em_centavos / 100).toFixed(2));
    } else {
      setFormData({
        produto_id: '',
        nome_plano: '',
        descricao: '',
        entregaveis: [],
        preco_em_centavos: 0,
        zapsign_template_id_pf: '',
        zapsign_template_id_pj: '',
        pagarme_plan_id: '',
        ativo: true,
        ordem_exibicao: 0,
        popular: false,
      });
      setPrecoFormatted('');
    }
    setNewEntregavel('');
  }, [plan, open]);

  const handlePrecoChange = (value: string) => {
    setPrecoFormatted(value);
    const numericValue = parseFloat(value.replace(',', '.')) || 0;
    setFormData(prev => ({ ...prev, preco_em_centavos: Math.round(numericValue * 100) }));
  };

  const addEntregavel = () => {
    if (newEntregavel.trim()) {
      setFormData(prev => ({
        ...prev,
        entregaveis: [...prev.entregaveis, newEntregavel.trim()]
      }));
      setNewEntregavel('');
    }
  };

  const removeEntregavel = (index: number) => {
    setFormData(prev => ({
      ...prev,
      entregaveis: prev.entregaveis.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.produto_id) {
      return;
    }

    try {
      if (plan) {
        await updatePlano(plan.id, formData);
      } else {
        await createPlano(formData);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {plan ? 'Editar Plano' : 'Novo Plano'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="produto_id">Produto *</Label>
            <Select
              value={formData.produto_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, produto_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((produto) => (
                  <SelectItem key={produto.id} value={produto.id}>
                    {produto.nome_produto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_plano">Nome do Plano *</Label>
              <Input
                id="nome_plano"
                value={formData.nome_plano}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_plano: e.target.value }))}
                placeholder="Ex: Plano Anual"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preco">Preço (R$) *</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                min="0"
                value={precoFormatted}
                onChange={(e) => handlePrecoChange(e.target.value)}
                placeholder="999.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva o que está incluído no plano..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Entregáveis</Label>
            <div className="flex gap-2">
              <Input
                value={newEntregavel}
                onChange={(e) => setNewEntregavel(e.target.value)}
                placeholder="Adicionar entregável..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEntregavel())}
              />
              <Button type="button" size="sm" onClick={addEntregavel}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.entregaveis.map((item, index) => (
                <Badge key={index} variant="secondary" className="pr-1">
                  {item}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 ml-2"
                    onClick={() => removeEntregavel(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zapsign_pf">ZapSign Template PF</Label>
              <Input
                id="zapsign_pf"
                value={formData.zapsign_template_id_pf}
                onChange={(e) => setFormData(prev => ({ ...prev, zapsign_template_id_pf: e.target.value }))}
                placeholder="ID do template para Pessoa Física"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zapsign_pj">ZapSign Template PJ</Label>
              <Input
                id="zapsign_pj"
                value={formData.zapsign_template_id_pj}
                onChange={(e) => setFormData(prev => ({ ...prev, zapsign_template_id_pj: e.target.value }))}
                placeholder="ID do template para Pessoa Jurídica"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pagarme_plan">Pagar.me Plan ID</Label>
              <Input
                id="pagarme_plan"
                value={formData.pagarme_plan_id}
                onChange={(e) => setFormData(prev => ({ ...prev, pagarme_plan_id: e.target.value }))}
                placeholder="ID do plano no Pagar.me (opcional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ordem">Ordem de Exibição</Label>
              <Input
                id="ordem"
                type="number"
                min="0"
                value={formData.ordem_exibicao}
                onChange={(e) => setFormData(prev => ({ ...prev, ordem_exibicao: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
              <Label htmlFor="ativo">Plano ativo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="popular"
                checked={formData.popular}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, popular: checked }))}
              />
              <Label htmlFor="popular">Marcar como popular</Label>
            </div>
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