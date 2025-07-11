
import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus, Eye, Edit, Mail, CreditCard, Trash2, MapPin, Upload } from 'lucide-react';
import { useAdminClients, AdminClient } from '@/hooks/useAdminClients';
import ClientFormModal from './ClientFormModal';
import DeleteClientDialog from './DeleteClientDialog';
import ClientDetailModal from './ClientDetailModal';
import { toast } from '@/hooks/use-toast';

const AdminClients = () => {
  const { clients, loading, error, refetch } = useAdminClients();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<AdminClient | null>(null);

  // File upload states
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.cnpj.includes(searchTerm) ||
                           client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.endereco.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const getStatusBadge = (status: AdminClient['status']) => {
    const statusConfig = {
      active: { label: 'Ativo', className: 'bg-green-100 text-green-800' },
      overdue: { label: 'Em Atraso', className: 'bg-red-100 text-red-800' },
      suspended: { label: 'Suspenso', className: 'bg-yellow-100 text-yellow-800' },
      pending: { label: 'Pendente', className: 'bg-gray-100 text-gray-800' },
    };
    
    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const clientStats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    overdue: clients.filter(c => c.status === 'overdue').length
  }), [clients]);

  const handleAddClient = () => {
    setSelectedClient(null);
    setIsFormModalOpen(true);
  };

  const handleEditClient = (client: AdminClient) => {
    setSelectedClient(client);
    setIsFormModalOpen(true);
  };

  const handleDeleteClient = (client: AdminClient) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const handleViewClient = (client: AdminClient) => {
    setSelectedClient(client);
    setIsDetailModalOpen(true);
  };

  const handleSendCorrespondence = (clientId: string) => {
    console.log(`Enviando correspondência para cliente ${clientId}`);
    // TODO: Implementar envio de correspondência
  };

  const handleManagePayment = (clientId: string) => {
    console.log(`Gerenciando pagamento do cliente ${clientId}`);
    // TODO: Implementar gerenciamento de pagamentos
  };

  const handleFormSuccess = () => {
    refetch();
  };

  const handleDeleteSuccess = () => {
    refetch();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // URL do webhook do n8n atualizada
    const N8N_WEBHOOK_URL = 'https://sidneyarfe.app.n8n.cloud/webhook-test/1b2f6961-5011-4f3a-af9b-63b83dc523ee';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Falha no upload para o n8n');
      }

      toast({
        title: 'Upload Concluído',
        description: 'A planilha foi enviada para processamento. Os clientes serão adicionados em segundo plano.',
      });

      // Refresh the clients list after successful upload
      refetch();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no Upload',
        description: 'Não foi possível enviar a planilha. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Clientes</h1>
          <p className="text-gray-600">Gerencie todos os clientes do sistema</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Clientes</h1>
          <p className="text-gray-600">Gerencie todos os clientes do sistema</p>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600">Erro ao carregar clientes: {error}</p>
          <Button onClick={() => refetch()} className="mt-4">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Clientes</h1>
          <p className="text-gray-600">
            Gerencie todos os clientes do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv,.xlsx,.xls" 
            style={{ display: 'none' }} 
          />
          <Button 
            variant="outline" 
            className="flex items-center gap-2" 
            onClick={handleImportClick} 
            disabled={isUploading}
          >
            {isUploading ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Importar Planilha
          </Button>
          <Button className="on-button flex items-center gap-2" onClick={handleAddClient}>
            <Plus className="w-4 h-4" />
            Adicionar Cliente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="on-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, CNPJ, email ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrar Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="overdue">Em Atraso</SelectItem>
                  <SelectItem value="suspended">Suspensos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-on-lime">{clientStats.total}</div>
            <div className="text-sm text-gray-600">Total de Clientes</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{clientStats.active}</div>
            <div className="text-sm text-gray-600">Clientes Ativos</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{clientStats.overdue}</div>
            <div className="text-sm text-gray-600">Inadimplentes</div>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {filteredClients.length} clientes encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CNPJ/CPF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endereço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Próximo Venc.
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      <div className="text-xs text-gray-500">{client.email}</div>
                      <div className="text-xs text-gray-500">{client.telefone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>{client.cnpj !== 'N/A' ? client.cnpj : client.cpf_responsavel}</div>
                      <div className="text-xs text-gray-500">
                        {client.tipo_pessoa === 'juridica' ? 'PJ' : 'PF'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                      <div className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                        <div>
                          <div className="text-xs">{client.endereco}</div>
                          <div className="text-xs text-gray-500">
                            {client.bairro && `${client.bairro}, `}{client.cidade}/{client.estado}
                          </div>
                          <div className="text-xs text-gray-500">CEP: {client.cep}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {client.plan}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(client.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {client.nextDue}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClient(client)}
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClient(client)}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClient(client)}
                          title="Deletar"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendCorrespondence(client.id)}
                          title="Enviar Correspondência"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManagePayment(client.id)}
                          title="Gerenciar Pagamentos"
                        >
                          <CreditCard className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredClients.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Search className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Nenhum cliente encontrado</h3>
          <p className="mt-2 text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Tente ajustar os filtros ou termos de busca.' 
              : 'Ainda não há clientes cadastrados no sistema.'}
          </p>
          {searchTerm === '' && statusFilter === 'all' && (
            <Button onClick={handleAddClient} className="mt-4">
              Adicionar Primeiro Cliente
            </Button>
          )}
        </div>
      )}

      {/* Modals */}
      <ClientFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        client={selectedClient}
        onSuccess={handleFormSuccess}
      />

      <DeleteClientDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        client={selectedClient}
        onSuccess={handleDeleteSuccess}
      />

      <ClientDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        client={selectedClient}
      />
    </div>
  );
};

export default AdminClients;
