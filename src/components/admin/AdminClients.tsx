
import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus, Eye, Edit, Mail, CreditCard, Trash2, MapPin, Upload, Download, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { useAdminClients, AdminClient } from '@/hooks/useAdminClients';
import ClientFormModal from './ClientFormModal';
import DeleteClientDialog from './DeleteClientDialog';
import ClientDetailModal from './ClientDetailModal';
import { toast } from '@/hooks/use-toast';

type SortField = 'name' | 'email' | 'cidade' | 'plan' | 'status' | 'nextDue' | 'joinDate';
type SortDirection = 'asc' | 'desc';

const AdminClients = () => {
  const { clients, loading, error, refetch } = useAdminClients();
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<AdminClient | null>(null);

  // File upload states
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get unique values for filters
  const uniqueValues = useMemo(() => {
    const cities = [...new Set(clients.map(c => c.cidade))].filter(Boolean).sort();
    const states = [...new Set(clients.map(c => c.estado))].filter(Boolean).sort();
    const plans = [...new Set(clients.map(c => c.plan))].filter(Boolean).sort();
    const types = [...new Set(clients.map(c => c.tipo_pessoa))].filter(Boolean).sort();
    
    return { cities, states, plans, types };
  }, [clients]);

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients.filter(client => {
      // Search filter - mais robusto
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        client.name.toLowerCase().includes(searchLower) ||
        (client.cnpj && client.cnpj.toLowerCase().includes(searchLower)) ||
        (client.cpf_responsavel && client.cpf_responsavel.toLowerCase().includes(searchLower)) ||
        client.email.toLowerCase().includes(searchLower) ||
        client.cidade.toLowerCase().includes(searchLower) ||
        client.estado.toLowerCase().includes(searchLower) ||
        client.endereco.toLowerCase().includes(searchLower) ||
        (client.bairro && client.bairro.toLowerCase().includes(searchLower)) ||
        client.telefone.includes(searchTerm) ||
        client.cep.includes(searchTerm);

      // Status filter
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      
      // Plan filter
      const matchesPlan = planFilter === 'all' || client.plan === planFilter;
      
      // City filter
      const matchesCity = cityFilter === 'all' || client.cidade === cityFilter;
      
      // State filter
      const matchesState = stateFilter === 'all' || client.estado === stateFilter;
      
      // Type filter
      const matchesType = typeFilter === 'all' || client.tipo_pessoa === typeFilter;
      
      return matchesSearch && matchesStatus && matchesPlan && matchesCity && matchesState && matchesType;
    });

    // Sort clients
    filtered.sort((a, b) => {
      let aValue: string | number = a[sortField];
      let bValue: string | number = b[sortField];

      // Handle date fields
      if (sortField === 'nextDue' || sortField === 'joinDate') {
        const aDate = new Date(aValue.split('/').reverse().join('-')).getTime();
        const bDate = new Date(bValue.split('/').reverse().join('-')).getTime();
        
        if (aDate < bDate) return sortDirection === 'asc' ? -1 : 1;
        if (aDate > bDate) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [clients, searchTerm, statusFilter, planFilter, cityFilter, stateFilter, typeFilter, sortField, sortDirection]);

  // Paginate clients
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedClients, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);

  const getStatusBadge = (status: AdminClient['status']) => {
    const statusConfig = {
      iniciado: { label: 'Iniciado', className: 'bg-blue-100 text-blue-800' },
      contrato_enviado: { label: 'Contrato Enviado', className: 'bg-purple-100 text-purple-800' },
      contrato_assinado: { label: 'Contrato Assinado', className: 'bg-indigo-100 text-indigo-800' },
      pagamento_pendente: { label: 'Pagamento Pendente', className: 'bg-orange-100 text-orange-800' },
      pagamento_confirmado: { label: 'Pagamento Confirmado', className: 'bg-green-100 text-green-800' },
      ativo: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-800' },
      suspenso: { label: 'Suspenso', className: 'bg-yellow-100 text-yellow-800' },
      cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
    };
    
    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const clientStats = useMemo(() => ({
    total: clients.length,
    iniciado: clients.filter(c => c.status === 'iniciado').length,
    ativo: clients.filter(c => c.status === 'ativo').length,
    pagamento_pendente: clients.filter(c => c.status === 'pagamento_pendente').length,
    cancelado: clients.filter(c => c.status === 'cancelado').length,
    filtered: filteredAndSortedClients.length
  }), [clients, filteredAndSortedClients]);

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

  // Sorting handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4" />
      : <ArrowDown className="w-4 h-4" />;
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPlanFilter('all');
    setCityFilter('all');
    setStateFilter('all');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  // Export functionality
  const exportToCSV = () => {
    const headers = [
      'Nome', 'Email', 'Telefone', 'CPF/CNPJ', 'Tipo Pessoa', 
      'Endereço', 'Cidade', 'Estado', 'CEP', 'Plano', 'Status', 
      'Data Adesão', 'Próximo Vencimento'
    ];
    
    const csvData = filteredAndSortedClients.map(client => [
      client.name,
      client.email,
      client.telefone,
      client.cnpj !== 'N/A' ? client.cnpj : client.cpf_responsavel,
      client.tipo_pessoa === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física',
      client.endereco,
      client.cidade,
      client.estado,
      client.cep,
      client.plan,
      getStatusLabel(client.status),
      client.joinDate,
      client.nextDue
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Exportação concluída',
      description: `${filteredAndSortedClients.length} clientes exportados para CSV.`,
    });
  };

  const getStatusLabel = (status: AdminClient['status']) => {
    const statusLabels = {
      iniciado: 'Iniciado',
      contrato_enviado: 'Contrato Enviado',
      contrato_assinado: 'Contrato Assinado',
      pagamento_pendente: 'Pagamento Pendente',
      pagamento_confirmado: 'Pagamento Confirmado',
      ativo: 'Ativo',
      suspenso: 'Suspenso',
      cancelado: 'Cancelado'
    };
    return statusLabels[status] || 'Desconhecido';
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

      {/* Search and Filters */}
      <Card className="on-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Filtros e Pesquisa</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-1"
              >
                <Filter className="w-4 h-4" />
                Limpar Filtros
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome, CNPJ/CPF, email, cidade, endereço, telefone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="iniciado">Iniciado</SelectItem>
                <SelectItem value="contrato_enviado">Contrato Enviado</SelectItem>
                <SelectItem value="contrato_assinado">Contrato Assinado</SelectItem>
                <SelectItem value="pagamento_pendente">Pagamento Pendente</SelectItem>
                <SelectItem value="pagamento_confirmado">Pagamento Confirmado</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={planFilter} onValueChange={(value) => { setPlanFilter(value); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                {uniqueValues.plans.map(plan => (
                  <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="fisica">Pessoa Física</SelectItem>
                <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={(value) => { setStateFilter(value); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Estados</SelectItem>
                {uniqueValues.states.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={(value) => { setCityFilter(value); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Cidades</SelectItem>
                {uniqueValues.cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || statusFilter !== 'all' || planFilter !== 'all' || cityFilter !== 'all' || stateFilter !== 'all' || typeFilter !== 'all') && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-gray-600">Filtros ativos:</span>
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Pesquisa: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-red-500">×</button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {getStatusLabel(statusFilter as AdminClient['status'])}
                  <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-red-500">×</button>
                </Badge>
              )}
              {planFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Plano: {planFilter}
                  <button onClick={() => setPlanFilter('all')} className="ml-1 hover:text-red-500">×</button>
                </Badge>
              )}
              {typeFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Tipo: {typeFilter === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  <button onClick={() => setTypeFilter('all')} className="ml-1 hover:text-red-500">×</button>
                </Badge>
              )}
              {stateFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Estado: {stateFilter}
                  <button onClick={() => setStateFilter('all')} className="ml-1 hover:text-red-500">×</button>
                </Badge>
              )}
              {cityFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Cidade: {cityFilter}
                  <button onClick={() => setCityFilter('all')} className="ml-1 hover:text-red-500">×</button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-on-lime">{clientStats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{clientStats.ativo}</div>
            <div className="text-sm text-gray-600">Ativos</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{clientStats.pagamento_pendente}</div>
            <div className="text-sm text-gray-600">Pag. Pendente</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{clientStats.iniciado}</div>
            <div className="text-sm text-gray-600">Iniciados</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{clientStats.filtered}</div>
            <div className="text-sm text-gray-600">Filtrados</div>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <Card className="on-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Lista de Clientes</CardTitle>
              <CardDescription>
                Mostrando {paginatedClients.length} de {filteredAndSortedClients.length} clientes
                {filteredAndSortedClients.length !== clients.length && 
                  ` (${clients.length} total)`}
              </CardDescription>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Itens por página:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      className="flex items-center gap-1 hover:text-gray-700"
                      onClick={() => handleSort('name')}
                    >
                      Cliente
                      {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CNPJ/CPF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      className="flex items-center gap-1 hover:text-gray-700"
                      onClick={() => handleSort('cidade')}
                    >
                      Localização
                      {getSortIcon('cidade')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      className="flex items-center gap-1 hover:text-gray-700"
                      onClick={() => handleSort('plan')}
                    >
                      Plano
                      {getSortIcon('plan')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      className="flex items-center gap-1 hover:text-gray-700"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {getSortIcon('status')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      className="flex items-center gap-1 hover:text-gray-700"
                      onClick={() => handleSort('nextDue')}
                    >
                      Próximo Venc.
                      {getSortIcon('nextDue')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedClients.map((client) => (
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
      {filteredAndSortedClients.length === 0 && !loading && (
        <Card className="on-card">
          <CardContent className="text-center py-12">
            <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Nenhum cliente encontrado</h3>
            <p className="mt-2 text-gray-500">
              {searchTerm || statusFilter !== 'all' || planFilter !== 'all' || cityFilter !== 'all' || stateFilter !== 'all' || typeFilter !== 'all'
                ? 'Tente ajustar os filtros ou termos de busca.' 
                : 'Ainda não há clientes cadastrados no sistema.'}
            </p>
            <div className="flex gap-2 justify-center mt-4">
              {(searchTerm || statusFilter !== 'all' || planFilter !== 'all' || cityFilter !== 'all' || stateFilter !== 'all' || typeFilter !== 'all') && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              )}
              {clients.length === 0 && (
                <Button onClick={handleAddClient}>
                  Adicionar Primeiro Cliente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
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
