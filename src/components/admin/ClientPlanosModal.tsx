import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, CreditCard, Trash2, Plus, Edit } from 'lucide-react';
import { useClientPlanos, type ClientePlano } from '@/hooks/useClientPlanos';
import { useProducts } from '@/hooks/useProducts';
import { AdminClient } from '@/hooks/useAdminClients';
import { useToast } from '@/hooks/use-toast';

interface ClientPlanosModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: AdminClient;
  onUpdate?: () => void;
}

const ClientPlanosModal = ({ isOpen, onClose, client, onUpdate }: ClientPlanosModalProps) => {
  const [clientePlanos, setClientePlanos] = useState<ClientePlano[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  
  const { 
    loading, 
    fetchClientePlanos, 
    adicionarPlanoAoCliente, 
    atualizarClientePlano,
    removerPlanoDoCliente 
  } = useClientPlanos();
  
  const { planos } = useProducts();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && client.id) {
      loadClientePlanos();
    }
  }, [isOpen, client.id]);

  const loadClientePlanos = async () => {
    const planos = await fetchClientePlanos(client.id);
    setClientePlanos(planos);
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

    const success = await adicionarPlanoAoCliente(
      client.id, 
      selectedPlanoId, 
      new Date(dataInicio)
    );

    if (success) {
      await loadClientePlanos();
      setShowAddForm(false);
      setSelectedPlanoId('');
      setDataInicio(new Date().toISOString().split('T')[0]);
      onUpdate?.();
    }
  };

  const handleRemovePlano = async (clientePlanoId: string) => {
    const success = await removerPlanoDoCliente(clientePlanoId);
    if (success) {
      await loadClientePlanos();
      onUpdate?.();
    }
  };

  const handleUpdateVencimento = async (clientePlanoId: string, novoVencimento: string) => {
    const success = await atualizarClientePlano(clientePlanoId, {
      proximo_vencimento: new Date(novoVencimento)
    });
    
    if (success) {
      await loadClientePlanos();
      onUpdate?.();
    }
  };

  const handleUpdateStatus = async (clientePlanoId: string, novoStatus: 'ativo' | 'suspenso' | 'cancelado') => {
    const success = await atualizarClientePlano(clientePlanoId, {
      status: novoStatus
    });
    
    if (success) {
      await loadClientePlanos();
      onUpdate?.();
    }
  };

  const getStatusBadge = (status: 'ativo' | 'suspenso' | 'cancelado') => {
    const statusConfig = {
      ativo: { label: 'Ativo', className: 'bg-green-100 text-green-800' },
      suspenso: { label: 'Suspenso', className: 'bg-yellow-100 text-yellow-800' },
      cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
    };
    
    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
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
          {/* Formulário para adicionar plano */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Adicionar Novo Plano
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Selecionar Plano</Label>
                    <Select value={selectedPlanoId} onValueChange={setSelectedPlanoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {planos.filter(p => p.ativo).map(plano => (
                          <SelectItem key={plano.id} value={plano.id}>
                            {plano.produtos?.nome_produto} - {plano.nome_plano} ({formatCurrency(plano.preco_em_centavos)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddPlano} disabled={loading}>
                    Adicionar Plano
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão para mostrar formulário */}
          {!showAddForm && (
            <Button 
              onClick={() => setShowAddForm(true)} 
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Plano ao Cliente
            </Button>
          )}

          {/* Lista de planos ativos do cliente */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Planos Ativos ({clientePlanos.length})</h3>
            
            {clientePlanos.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">Cliente não possui planos cadastrados</p>
                </CardContent>
              </Card>
            ) : (
              clientePlanos.map((clientePlano) => (
                <Card key={clientePlano.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">
                            {clientePlano.plano?.produtos?.nome_produto} - {clientePlano.plano?.nome_plano}
                          </h4>
                          {getStatusBadge(clientePlano.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            <span>Início: {clientePlano.data_inicio}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            <span>Próximo Vencimento: {clientePlano.proximo_vencimento}</span>
                          </div>
                          {clientePlano.data_ultimo_pagamento && (
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              <span>Último Pagamento: {clientePlano.data_ultimo_pagamento}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            <span>Valor: {clientePlano.plano ? formatCurrency(clientePlano.plano.preco_em_centavos) : 'N/A'}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Vencimento:</Label>
                            <Input
                              type="date"
                              className="h-8 text-xs"
                              defaultValue={new Date(clientePlano.proximo_vencimento.split('/').reverse().join('-')).toISOString().split('T')[0]}
                              onBlur={(e) => handleUpdateVencimento(clientePlano.id, e.target.value)}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Status:</Label>
                            <Select 
                              value={clientePlano.status} 
                              onValueChange={(value: 'ativo' | 'suspenso' | 'cancelado') => handleUpdateStatus(clientePlano.id, value)}
                            >
                              <SelectTrigger className="h-8 text-xs w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ativo">Ativo</SelectItem>
                                <SelectItem value="suspenso">Suspenso</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemovePlano(clientePlano.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
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