import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus } from 'lucide-react';
import { useProducts, type Produto, type Plano } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';

interface PlanFormModalProps {
  open: boolean;
  onClose: () => void;
  plan?: Plano | null;
}

const PlanFormModal = ({ open, onClose, plan }: PlanFormModalProps) => {
  const { produtos, createPlano, updatePlano } = useProducts();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    produto_id: '',
    nome_plano: '',
    descricao: '',
    entregaveis: [''],
    preco_em_centavos: 0,
    numero_parcelas: 1,
    valor_parcela_centavos: null as number | null,
    periodicidade: 'anual' as 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bianual',
    zapsign_template_id_pf: '',
    zapsign_template_id_pj: '',
    pagarme_plan_id: '',
    ativo: true,
    listado_publicamente: true,
    ordem_exibicao: 0,
    popular: false,
  });

  const [newEntregavel, setNewEntregavel] = useState('');
  const [precoFormatted, setPrecoFormatted] = useState('');
  const [parcelaFormatted, setParcelaFormatted] = useState('');

  useEffect(() => {
    if (plan) {
      setFormData({
        produto_id: plan.produto_id,
        nome_plano: plan.nome_plano,
        descricao: plan.descricao || '',
        entregaveis: plan.entregaveis || [],
        preco_em_centavos: plan.preco_em_centavos,
        numero_parcelas: plan.numero_parcelas || 1,
        valor_parcela_centavos: plan.valor_parcela_centavos || null,
        periodicidade: plan.periodicidade || 'anual',
        zapsign_template_id_pf: plan.zapsign_template_id_pf || '',
        zapsign_template_id_pj: plan.zapsign_template_id_pj || '',
        pagarme_plan_id: plan.pagarme_plan_id || '',
        ativo: plan.ativo,
        listado_publicamente: plan.listado_publicamente,
        ordem_exibicao: plan.ordem_exibicao,
        popular: plan.popular,
      });
      setPrecoFormatted((plan.preco_em_centavos / 100).toFixed(2));
      setParcelaFormatted(plan.valor_parcela_centavos ? (plan.valor_parcela_centavos / 100).toFixed(2) : '');
    } else {
      setFormData({
        produto_id: '',
        nome_plano: '',
        descricao: '',
        entregaveis: [],
        preco_em_centavos: 0,
        numero_parcelas: 1,
        valor_parcela_centavos: null,
        periodicidade: 'anual' as const,
        zapsign_template_id_pf: '',
        zapsign_template_id_pj: '',
        pagarme_plan_id: '',
        ativo: true,
        listado_publicamente: true,
        ordem_exibicao: 0,
        popular: false,
      });
      setPrecoFormatted('');
      setParcelaFormatted('');
    }
  }, [plan]);

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

  const handlePrecoChange = (value: string) => {
    setPrecoFormatted(value);
    const numericValue = parseFloat(value.replace(',', '.')) || 0;
    setFormData(prev => ({
      ...prev,
      preco_em_centavos: Math.round(numericValue * 100)
    }));
  };

  const handleParcelaChange = (value: string) => {
    setParcelaFormatted(value);
    const numericValue = parseFloat(value.replace(',', '.')) || 0;
    setFormData(prev => ({
      ...prev,
      valor_parcela_centavos: value.trim() ? Math.round(numericValue * 100) : null
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.produto_id) {
      toast({
        title: "Erro",
        description: "Selecione um produto",
        variant: "destructive"
      });
      return;
    }

    try {
      if (plan) {
        await updatePlano(plan.id, formData);
        toast({
          title: "Sucesso",
          description: "Plano atualizado com sucesso!"
        });
      } else {
        await createPlano(formData);
        toast({
          title: "Sucesso", 
          description: "Plano criado com sucesso!"
        });
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar plano",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {plan ? 'Editar Plano' : 'Criar Novo Plano'}
          </DialogTitle>
          <DialogDescription>
            {plan ? 'Edite as informações do plano' : 'Preencha as informações para criar um novo plano'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="produto">Produto</Label>
            <Select 
              value={formData.produto_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, produto_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {produtos.filter(p => p.ativo).map((produto) => (
                  <SelectItem key={produto.id} value={produto.id}>
                    {produto.nome_produto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Plano</Label>
            <Input
              id="nome"
              value={formData.nome_plano}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_plano: e.target.value }))}
              placeholder="Ex: Plano Premium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preco">Preço Total (R$)</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                min="0"
                value={precoFormatted}
                onChange={(e) => handlePrecoChange(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_parcelas">Número de Parcelas (Exibição)</Label>
              <Input
                id="numero_parcelas"
                type="number"
                min="1"
                value={formData.numero_parcelas}
                onChange={(e) => setFormData(prev => ({ ...prev, numero_parcelas: parseInt(e.target.value) || 1 }))}
                placeholder="1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_parcela">Valor da Parcela (R$) - Opcional</Label>
            <Input
              id="valor_parcela"
              type="number"
              step="0.01"
              min="0"
              value={parcelaFormatted}
              onChange={(e) => handleParcelaChange(e.target.value)}
              placeholder="Deixe vazio se não houver parcelamento"
            />
            <p className="text-xs text-muted-foreground">
              Preencha apenas se quiser exibir parcelamento. Ex: 12x de R$ 74,58
            </p>
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
              {formData.entregaveis.filter(item => item.trim()).map((item, index) => (
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
              <Label htmlFor="periodicidade">Periodicidade</Label>
              <Select 
                value={formData.periodicidade} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, periodicidade: value as 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bianual' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="bianual">Bianual</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="popular">Plano popular</Label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="listado_publicamente"
                checked={formData.listado_publicamente}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, listado_publicamente: checked }))}
              />
              <Label htmlFor="listado_publicamente">Listado publicamente</Label>
            </div>
            <div className="text-sm text-muted-foreground">
              Controla se o plano aparece na página pública
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {plan ? 'Atualizar Plano' : 'Criar Plano'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlanFormModal;