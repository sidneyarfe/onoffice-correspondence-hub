
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AdminClient } from '@/hooks/useAdminClients';
import { MapPin, Mail, Phone, Calendar, FileText, Activity, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: AdminClient | null;
}

interface ClientActivity {
  id: string;
  acao: string;
  descricao: string;
  data_atividade: string;
}

interface ClientCorrespondence {
  id: string;
  remetente: string;
  assunto: string;
  data_recebimento: string;
  visualizada: boolean;
  categoria: string;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ isOpen, onClose, client }) => {
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [correspondences, setCorrespondences] = useState<ClientCorrespondence[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client && isOpen) {
      fetchClientDetails();
    }
  }, [client, isOpen]);

  const fetchClientDetails = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      // Buscar contratação para obter user_id
      const { data: contratacao } = await supabase
        .from('contratacoes_clientes')
        .select('user_id')
        .eq('id', client.id)
        .single();

      if (contratacao?.user_id) {
        // Buscar atividades
        const { data: activitiesData } = await supabase
          .from('atividades_cliente')
          .select('*')
          .eq('user_id', contratacao.user_id)
          .order('data_atividade', { ascending: false })
          .limit(10);

        // Buscar correspondências
        const { data: correspondencesData } = await supabase
          .from('correspondencias')
          .select('*')
          .eq('user_id', contratacao.user_id)
          .order('data_recebimento', { ascending: false })
          .limit(10);

        setActivities(activitiesData || []);
        setCorrespondences(correspondencesData || []);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: AdminClient['status']) => {
    const statusConfig = {
      'iniciado': { label: 'Iniciado', className: 'bg-blue-500/15 text-blue-300' },
      'contrato_enviado': { label: 'Contrato Enviado', className: 'bg-amber-400/15 text-amber-300' },
      'contrato_assinado': { label: 'Contrato Assinado', className: 'bg-on-lime/15 text-on-lime' },
      'pagamento_pendente': { label: 'Pagamento Pendente', className: 'bg-orange-400/15 text-orange-300' },
      'pagamento_confirmado': { label: 'Pagamento Confirmado', className: 'bg-on-lime/15 text-on-lime' },
      'ativo': { label: 'Ativo', className: 'bg-on-lime/15 text-on-lime' },
      'suspenso': { label: 'Suspenso', className: 'bg-red-500/15 text-red-300' },
      'cancelado': { label: 'Cancelado', className: 'bg-white/10 text-foreground' },
    };
    
    const config = statusConfig[status] || { label: 'Desconhecido', className: 'bg-white/10 text-foreground' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Cliente</span>
            {getStatusBadge(client.status)}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="correspondence">Correspondências</TabsTrigger>
            <TabsTrigger value="activities">Atividades</TabsTrigger>
            <TabsTrigger value="contract">Contrato</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dados Pessoais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dados Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium text-foreground/80">Nome</h4>
                    <p className="text-foreground">{client.name}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground/80">Tipo</h4>
                    <p className="text-foreground">
                      {client.tipo_pessoa === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground/80">
                      {client.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}
                    </h4>
                    <p className="text-foreground">
                      {client.cnpj !== 'N/A' ? client.cnpj : client.cpf_responsavel}
                    </p>
                  </div>
                  {client.razao_social && (
                    <div>
                      <h4 className="font-medium text-foreground/80">Razão Social</h4>
                      <p className="text-foreground">{client.razao_social}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contato */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium text-foreground/80">Email</h4>
                      <p className="text-foreground">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium text-foreground/80">Telefone</h4>
                      <p className="text-foreground">{client.telefone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-foreground">{client.endereco}</p>
                  <p className="text-muted-foreground">
                    {client.bairro && `${client.bairro}, `}
                    {client.cidade}/{client.estado}
                  </p>
                  <p className="text-muted-foreground">CEP: {client.cep}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="correspondence" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Correspondências Recentes
                  <Badge variant="secondary">{client.correspondences}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Carregando correspondências...</p>
                ) : correspondences.length > 0 ? (
                  <div className="space-y-3">
                    {correspondences.map((correspondence) => (
                      <div key={correspondence.id} className="border-l-4 border-blue-500/30 pl-4 py-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-foreground">{correspondence.assunto}</h4>
                            <p className="text-sm text-muted-foreground">De: {correspondence.remetente}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(correspondence.data_recebimento).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{correspondence.categoria}</Badge>
                            {correspondence.visualizada && (
                              <Badge className="bg-on-lime/15 text-on-lime">Visualizada</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhuma correspondência encontrada.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Atividades Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Carregando atividades...</p>
                ) : activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="border-l-4 border-white/10 pl-4 py-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-foreground">{activity.acao}</h4>
                            <p className="text-sm text-muted-foreground">{activity.descricao}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(activity.data_atividade).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhuma atividade encontrada.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contract" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Informações do Contrato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium text-foreground/80">Plano Contratado</h4>
                    <p className="text-foreground">{client.plan}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground/80">Data de Contratação</h4>
                    <p className="text-foreground">{client.joinDate}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground/80">Próximo Vencimento</h4>
                    <p className="text-foreground">{client.nextDue}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Status do Contrato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium text-foreground/80">Status Atual</h4>
                    {getStatusBadge(client.status)}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground/80">Correspondências</h4>
                    <p className="text-foreground">{client.correspondences} recebidas</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailModal;
