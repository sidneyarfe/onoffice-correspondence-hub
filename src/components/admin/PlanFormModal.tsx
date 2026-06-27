import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, ImageIcon, Star, Upload } from 'lucide-react';
import { useProducts, type Produto, type Plano } from '@/hooks/useProducts';
import { uploadOfertaImagem } from './ofertasStorage';
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
    unidade: '',
    zapsign_template_id_pf: '',
    zapsign_template_id_pj: '',
    pagarme_plan_id: '',
    ativo: true,
    listado_publicamente: true,
    ordem_exibicao: 0,
    popular: false,
    mostrar_parcelas: false,
    imagens: [] as string[],
    imagem_capa_url: null as string | null,
  });

  const [newEntregavel, setNewEntregavel] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);
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
        unidade: plan.unidade || '',
        zapsign_template_id_pf: plan.zapsign_template_id_pf || '',
        zapsign_template_id_pj: plan.zapsign_template_id_pj || '',
        pagarme_plan_id: plan.pagarme_plan_id || '',
        ativo: plan.ativo,
        listado_publicamente: plan.listado_publicamente,
        ordem_exibicao: plan.ordem_exibicao,
        popular: plan.popular,
        mostrar_parcelas: plan.mostrar_parcelas ?? false,
        imagens: plan.imagens || [],
        imagem_capa_url: plan.imagem_capa_url ?? null,
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
        unidade: '',
        zapsign_template_id_pf: '',
        zapsign_template_id_pj: '',
        pagarme_plan_id: '',
        ativo: true,
        listado_publicamente: true,
        ordem_exibicao: 0,
        popular: false,
        mostrar_parcelas: false,
        imagens: [],
        imagem_capa_url: null,
      });
      setPrecoFormatted('');
      setParcelaFormatted('');
    }
  }, [plan]);

  const produtoSelecionado = produtos.find(p => p.id === formData.produto_id);
  const isAvulso = produtoSelecionado?.tipo === 'avulso';
  const exigeContrato = produtoSelecionado?.exige_contrato ?? false;

  const handleAddImagens = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImg(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadOfertaImagem(plan?.id || 'novas', file));
      }
      setFormData(prev => ({
        ...prev,
        imagens: [...prev.imagens, ...urls],
        imagem_capa_url: prev.imagem_capa_url || urls[0] || null,
      }));
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao enviar imagem', description: 'Verifique se o bucket de ofertas existe.', variant: 'destructive' });
    } finally {
      setUploadingImg(false);
    }
  };

  const removeImagem = (url: string) => {
    setFormData(prev => ({
      ...prev,
      imagens: prev.imagens.filter(u => u !== url),
      imagem_capa_url: prev.imagem_capa_url === url ? (prev.imagens.find(u => u !== url) || null) : prev.imagem_capa_url,
    }));
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

    // Avulso usa `unidade`; assinatura zera `unidade` (usa periodicidade). Story 5.1.
    // Parcelas só persistem se o toggle estiver ligado; ZapSign só se o produto for "com contrato".
    const payload = {
      ...formData,
      unidade: isAvulso ? (formData.unidade.trim() || null) : null,
      numero_parcelas: formData.mostrar_parcelas ? formData.numero_parcelas : 1,
      valor_parcela_centavos: formData.mostrar_parcelas ? formData.valor_parcela_centavos : null,
      zapsign_template_id_pf: exigeContrato ? formData.zapsign_template_id_pf : '',
      zapsign_template_id_pj: exigeContrato ? formData.zapsign_template_id_pj : '',
    };

    try {
      if (plan) {
        await updatePlano(plan.id, payload);
        toast({
          title: "Sucesso",
          description: "Plano atualizado com sucesso!"
        });
      } else {
        await createPlano(payload);
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
            {plan ? 'Editar oferta' : 'Nova oferta'}
          </DialogTitle>
          <DialogDescription>
            {isAvulso
              ? 'Oferta avulsa (venda única) — defina preço e unidade.'
              : 'Oferta de assinatura (recorrente) — defina preço e periodicidade.'}
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
            <Label htmlFor="nome">Nome da oferta</Label>
            <Input
              id="nome"
              value={formData.nome_plano}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_plano: e.target.value }))}
              placeholder={isAvulso ? 'Ex: Hora de Sala' : 'Ex: Plano Anual'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preco">Preço (R$)</Label>
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

          <div className="space-y-3 rounded-lg border border-input p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="mostrar_parcelas">Mostrar parcelamento</Label>
                <p className="text-xs text-muted-foreground">Exibe "Nx de R$…" na vitrine. Só aparece se ligado.</p>
              </div>
              <Switch
                id="mostrar_parcelas"
                checked={formData.mostrar_parcelas}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mostrar_parcelas: checked }))}
              />
            </div>
            {formData.mostrar_parcelas && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_parcelas">Número de parcelas</Label>
                  <Input
                    id="numero_parcelas"
                    type="number"
                    min="1"
                    value={formData.numero_parcelas}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero_parcelas: parseInt(e.target.value) || 1 }))}
                    placeholder="12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_parcela">Valor da parcela (R$)</Label>
                  <Input
                    id="valor_parcela"
                    type="number"
                    step="0.01"
                    min="0"
                    value={parcelaFormatted}
                    onChange={(e) => handleParcelaChange(e.target.value)}
                    placeholder="Ex: 74,58"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva o que está incluído na oferta..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Imagens da oferta (opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {formData.imagens.map((url) => {
                const isCapa = formData.imagem_capa_url === url;
                return (
                  <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-input">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {isCapa && (
                      <span className="absolute left-1 top-1 rounded bg-on-lime px-1 py-0.5 text-[9px] font-bold text-on-black">Capa</span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                      {!isCapa && (
                        <button
                          type="button"
                          title="Definir como capa"
                          onClick={() => setFormData(prev => ({ ...prev, imagem_capa_url: url }))}
                          className="rounded bg-white/15 p-1 text-white hover:bg-white/25"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Remover"
                        onClick={() => removeImagem(url)}
                        className="rounded bg-white/15 p-1 text-white hover:bg-red-500/70"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-muted-foreground transition-colors hover:border-on-lime/50 hover:text-foreground">
                {uploadingImg ? <Upload className="h-4 w-4 animate-pulse" /> : <ImageIcon className="h-4 w-4" />}
                <span className="text-[10px]">{uploadingImg ? 'Enviando…' : 'Adicionar'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploadingImg}
                  onChange={(e) => { handleAddImagens(e.target.files); e.target.value = ''; }}
                />
              </label>
            </div>
            {formData.imagens.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Passe o mouse numa imagem para definir a <b>capa</b> (★) ou remover.
              </p>
            )}
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

          <div className="space-y-2">
            {isAvulso ? (
              <>
                <Label htmlFor="unidade">Unidade de venda</Label>
                <Input
                  id="unidade"
                  value={formData.unidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, unidade: e.target.value }))}
                  placeholder="Ex: hora, diária, unidade"
                />
                <p className="text-xs text-muted-foreground">
                  Avulso — venda única por quantidade desta unidade (ex.: horas de sala).
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          {exigeContrato && (
            <div className="space-y-2 rounded-lg border border-indigo-400/25 bg-indigo-400/[0.04] p-3">
              <p className="text-xs font-medium text-indigo-200">
                Templates de contrato (ZapSign) — produto "com contrato"
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zapsign_pf">Template PF</Label>
                  <Input
                    id="zapsign_pf"
                    value={formData.zapsign_template_id_pf}
                    onChange={(e) => setFormData(prev => ({ ...prev, zapsign_template_id_pf: e.target.value }))}
                    placeholder="ID do template (Pessoa Física)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zapsign_pj">Template PJ</Label>
                  <Input
                    id="zapsign_pj"
                    value={formData.zapsign_template_id_pj}
                    onChange={(e) => setFormData(prev => ({ ...prev, zapsign_template_id_pj: e.target.value }))}
                    placeholder="ID do template (Pessoa Jurídica)"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
              <Label htmlFor="ativo">Oferta ativa</Label>
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
              Controla se a oferta aparece na página pública
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {plan ? 'Atualizar oferta' : 'Criar oferta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlanFormModal;