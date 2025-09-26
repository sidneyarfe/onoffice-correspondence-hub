import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, CreditCard, Trash2, Plus, Edit } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { AdminClient } from '@/hooks/useAdminClients';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatters';

interface ClientePlanoPrincipal {
  plano_selecionado: string;
  produto_selecionado: string;
  plano_id: string;
  produto_id: string;
  ultimo_pagamento: string | null;
  proximo_vencimento: string | null;
  preco: number | null;
}
interface ClientPlanosModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: AdminClient;
  onUpdate?: () => void;
}

const ClientPlanosModal = ({ isOpen, onClose, client, onUpdate }: ClientPlanosModalProps) => {
  const [planoPrincipal, setPlanoPrincipal] = useState<ClientePlanoPrincipal | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState('');
  const [selectedProdutoId, setSelectedProdutoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [proximoVencimento, setProximoVencimento] = useState('');
  const [ultimoPagamento, setUltimoPagamento] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  
  const { produtos, planos } = useProducts();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && client.id) {
      loadPlanoPrincipal();
    }
  }, [isOpen, client.id]);

  useEffect(() => {
    if (planoPrincipal) {
      setProximoVencimento(planoPrincipal.proximo_vencimento || '');
      setUltimoPagamento(planoPrincipal.ultimo_pagamento || '');
      setHasChanges(false);
    }
  }, [planoPrincipal]);

  const loadPlanoPrincipal = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contratacoes_clientes')
        .select(`
          plano_selecionado,
          produto_selecionado, 
          plano_id,
          produto_id,
          ultimo_pagamento,
          proximo_vencimento,
          preco
        `)
        .eq('id', client.id)
        .single();

      if (error) throw error;

      // Se tem plano_selecionado, significa que tem um plano atribuído
      if (data?.plano_selecionado) {
        setPlanoPrincipal(data);
      } else {
        setPlanoPrincipal(null);
      }
    } catch (error) {
      console.error('Erro ao carregar plano principal:', error);
      setPlanoPrincipal(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlano = async () => {
    if (!selectedPlanoId) {
      toast({
        title: 'Erro',
        description: 'Selecione um plano',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Buscar informações do plano e do produto
      const { data: planoData } = await supabase
        .from('planos')
        .select(`
          id, 
          nome_plano, 
          periodicidade, 
          produto_id, 
          preco_em_centavos,
          produtos:produto_id ( nome_produto )
        `)
        .eq('id', selectedPlanoId)
        .single();

      if (!planoData) {
        throw new Error('Plano não encontrado');
      }

      // Calcular próximo vencimento baseado na periodicidade
      const hoje = new Date();
      const proximoVencimento = new Date(hoje);
      switch (planoData.periodicidade) {
        case 'semanal':
          proximoVencimento.setDate(proximoVencimento.getDate() + 7); break;
        case 'mensal':
          proximoVencimento.setMonth(proximoVencimento.getMonth() + 1); break;
        case 'trimestral':
          proximoVencimento.setMonth(proximoVencimento.getMonth() + 3); break;
        case 'semestral':
          proximoVencimento.setMonth(proximoVencimento.getMonth() + 6); break;
        case 'bianual':
          proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 2); break;
        case 'anual':
        default:
          proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1); break;
      }

      // Atualizar na tabela principal
      const { error } = await supabase
        .from('contratacoes_clientes')
        .update({
          produto_id: planoData.produto_id,
          plano_id: selectedPlanoId,
          produto_selecionado: planoData.produtos?.nome_produto || null,
          plano_selecionado: planoData.nome_plano,
          proximo_vencimento: proximoVencimento.toISOString().split('T')[0],
          preco: planoData.preco_em_centavos, // Agora mantém em centavos
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Plano adicionado ao cliente com sucesso'
      });

      await loadPlanoPrincipal();
      setShowAddForm(false);
      setSelectedPlanoId('');
      setSelectedProdutoId('');
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao adicionar plano:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o plano',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePlano = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('contratacoes_clientes')
        .update({
          produto_id: null,
          plano_id: null,
          produto_selecionado: null,
          plano_selecionado: null,
          proximo_vencimento: null,
          ultimo_pagamento: null,
          preco: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Plano removido do cliente'
      });

      await loadPlanoPrincipal();
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao remover plano:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o plano',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) return;
    
    try {
      setLoading(true);

      const { error } = await supabase
        .from('contratacoes_clientes')
        .update({
          proximo_vencimento: proximoVencimento || null,
          ultimo_pagamento: ultimoPagamento || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Alterações salvas com sucesso'
      });

      await loadPlanoPrincipal();
      setHasChanges(false);
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(centavos / 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planos do Cliente: {client.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plano Principal do Cliente */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Plano do Cliente</h3>
            
            {planoPrincipal ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-semibold text-lg">
                          {planoPrincipal.produto_selecionado} - {planoPrincipal.plano_selecionado}
                        </h4>
                        <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4" />
                          <span>Próximo Vencimento: {formatDate(planoPrincipal.proximo_vencimento)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span>Último Pagamento: {formatDate(planoPrincipal.ultimo_pagamento)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span>Valor: {planoPrincipal.preco ? formatCurrency(planoPrincipal.preco) : 'N/A'}</span>
                        </div>
                      </div>

                      {/* Campos editáveis */}
                      <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Próximo Vencimento</Label>
                          <Input
                            type="date"
                            value={proximoVencimento}
                            onChange={(e) => {
                              setProximoVencimento(e.target.value);
                              setHasChanges(true);
                            }}
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Último Pagamento</Label>
                          <Input
                            type="date"
                            value={ultimoPagamento}
                            onChange={(e) => {
                              setUltimoPagamento(e.target.value);
                              setHasChanges(true);
                            }}
                            className="text-sm"
                          />
                        </div>
                      </div>

                      {/* Botão de salvar alterações */}
                      {hasChanges && (
                        <div className="flex justify-end mt-4">
                          <Button 
                            onClick={handleSaveChanges} 
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Salvar Alterações
                          </Button>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemovePlano}
                      className="text-red-600 hover:text-red-700"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Formulário para adicionar plano quando não tem nenhum */}
                {showAddForm ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Adicionar Plano ao Cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Produto</Label>
                          <Select value={selectedProdutoId} onValueChange={(value) => {
                            setSelectedProdutoId(value);
                            setSelectedPlanoId(''); // Reset plano quando troca produto
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um produto" />
                            </SelectTrigger>
                            <SelectContent>
                              {produtos.filter(p => p.ativo).map(produto => (
                                <SelectItem key={produto.id} value={produto.id}>
                                  {produto.nome_produto}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Plano</Label>
                          <Select 
                            value={selectedPlanoId} 
                            onValueChange={setSelectedPlanoId}
                            disabled={!selectedProdutoId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um plano" />
                            </SelectTrigger>
                            <SelectContent>
                              {planos
                                .filter(p => p.ativo && p.produto_id === selectedProdutoId)
                                .map(plano => (
                                  <SelectItem key={plano.id} value={plano.id}>
                                    {plano.nome_plano} ({formatCurrency(plano.preco_em_centavos)})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddForm(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddPlano} disabled={loading || !selectedPlanoId}>
                          Adicionar Plano
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-gray-500 mb-4">Cliente não possui plano cadastrado</p>
                      <Button 
                        onClick={() => setShowAddForm(true)} 
                        variant="outline"
                        className="w-full max-w-sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Plano
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientPlanosModal;