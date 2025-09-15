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
import { ClientBatchImportModal } from './ClientBatchImportModal';
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
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
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
          <h1 className="text-3xl font-bold text-on-dark mb-2">Clientes - Admin</h1>
          <p className="text-gray-600">Carregando todos os registros...</p>
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
          <h1 className="text-3xl font-bold text-on-dark mb-2">Clientes - Admin</h1>
          <p className="text-gray-600">Erro ao carregar dados</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Clientes - Admin Total</h1>
          <p className="text-gray-600">
            📊 Todos os {clients.length} registros da tabela contratacoes_clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2" 
            onClick={() => setIsBatchImportOpen(true)}
          >
            <Upload className="w-4 h-4" />
            Importar via Planilha
          </Button>
          <Button className="on-button flex items-center gap-2" onClick={handleAddClient}>
            <Plus className="w-4 h-4" />
            Adicionar
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
                Limpar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                CSV
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
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="on-card">
          <CardContent className="p-3">
            <div className="text-xl font-bold text-on-dark">{clientStats.total}</div>
            <p className="text-xs text-gray-600">Total</p>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-3">
            <div className="text-xl font-bold text-green-600">{clientStats.ativo}</div>
            <p className="text-xs text-gray-600">Ativos</p>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-3">
            <div className="text-xl font-bold text-blue-600">{clientStats.iniciado}</div>
            <p className="text-xs text-gray-600">Iniciados</p>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-3">
            <div className="text-xl font-bold text-orange-600">{clientStats.pagamento_pendente}</div>
            <p className="text-xs text-gray-600">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-3">
            <div className="text-xl font-bold text-red-600">{clientStats.cancelado}</div>
            <p className="text-xs text-gray-600">Cancelados</p>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-3">
            <div className="text-xl font-bold text-purple-600">{clientStats.filtered}</div>
            <p className="text-xs text-gray-600">Filtrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Clientes */}
      <Card className="on-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              Todos os Registros ({filteredAndSortedClients.length} de {clients.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAndSortedClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum cliente encontrado com os filtros aplicados.</p>
              <p className="text-sm text-gray-400 mt-2">📋 Total na base: {clients.length} registros</p>
            </div>
          ) : (
            <>
              {/* Tabela Responsiva */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <Button variant="ghost" onClick={() => handleSort('name')} className="text-xs p-1 h-auto">
                          Nome/Empresa {getSortIcon('name')}
                        </Button>
                      </th>
                      <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <Button variant="ghost" onClick={() => handleSort('email')} className="text-xs p-1 h-auto">
                          Email {getSortIcon('email')}
                        </Button>
                      </th>
                      <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <Button variant="ghost" onClick={() => handleSort('cidade')} className="text-xs p-1 h-auto">
                          Cidade {getSortIcon('cidade')}
                        </Button>
                      </th>
                      <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <Button variant="ghost" onClick={() => handleSort('plan')} className="text-xs p-1 h-auto">
                          Plano {getSortIcon('plan')}
                        </Button>
                      </th>
                      <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <Button variant="ghost" onClick={() => handleSort('status')} className="text-xs p-1 h-auto">
                          Status {getSortIcon('status')}
                        </Button>
                      </th>
                      <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <Button variant="ghost" onClick={() => handleSort('joinDate')} className="text-xs p-1 h-auto">
                          Data {getSortIcon('joinDate')}
                        </Button>
                      </th>
                      <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <Button variant="ghost" onClick={() => handleSort('nextDue')} className="text-xs p-1 h-auto">
                          Venc. {getSortIcon('nextDue')}
                        </Button>
                      </th>
                      <th className="p-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Corresp.
                      </th>
                      <th className="p-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedClients.map((client, index) => (
                      <tr key={client.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="p-2 whitespace-nowrap">
                          <div className="max-w-48">
                            <div className="text-sm font-medium text-gray-900 truncate" title={client.name}>
                              {client.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {client.tipo_pessoa === 'juridica' ? 
                                `CNPJ: ${client.cnpj}` : 
                                `CPF: ${client.cpf_responsavel}`
                              }
                            </div>
                          </div>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <Badge variant={client.tipo_pessoa === 'juridica' ? 'default' : 'secondary'} className="text-xs">
                            {client.tipo_pessoa === 'juridica' ? 'PJ' : 'PF'}
                          </Badge>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900 max-w-48 truncate" title={client.email}>
                            {client.email}
                          </div>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{client.telefone}</div>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900 max-w-32 truncate" title={client.cidade}>
                            {client.cidade}
                          </div>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{client.estado}</div>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{client.plan}</div>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {getStatusBadge(client.status)}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{client.joinDate}</div>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{client.nextDue}</div>
                        </td>
                        <td className="p-2 whitespace-nowrap text-center">
                          <Badge variant="outline" className="text-xs">
                            {client.correspondences}
                          </Badge>
                        </td>
                        <td className="p-2 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewClient(client)}
                              className="p-1 h-auto"
                              title="Ver detalhes"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClient(client)}
                              className="p-1 h-auto"
                              title="Editar"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClient(client)}
                              className="p-1 h-auto text-red-600 hover:text-red-800"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <div className="text-sm text-gray-700">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} a{' '}
                    {Math.min(currentPage * itemsPerPage, filteredAndSortedClients.length)} de{' '}
                    {filteredAndSortedClients.length} registros filtrados
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      ‹‹ Primeira
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      ‹ Anterior
                    </Button>
                    <span className="text-sm text-gray-600 px-3">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima ›
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Última ››
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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

      <ClientBatchImportModal
        isOpen={isBatchImportOpen}
        onClose={() => setIsBatchImportOpen(false)}
        onImportComplete={() => {
          refetch();
          setIsBatchImportOpen(false);
        }}
      />
    </div>
  );
};

export default AdminClients;