import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, Plus, Eye, Edit, CreditCard, Trash2, Upload, Download, RefreshCw, MoreHorizontal } from 'lucide-react';
import { useAdminClients, AdminClient } from '@/hooks/useAdminClients';
import { DataView, DataViewColumn } from '@/components/shared/DataView';
import ClientFormModal from './ClientFormModal';
import DeleteClientDialog from './DeleteClientDialog';
import ClientDetailModal from './ClientDetailModal';
import ClientPlanosModal from './ClientPlanosModal';
import { ClientBatchImportModal } from './ClientBatchImportModal';
import { toast } from '@/hooks/use-toast';

const STATUS_CONFIG: Record<AdminClient['status'], { label: string; short: string; className: string }> = {
  iniciado: { label: 'Iniciado', short: 'Iniciado', className: 'bg-blue-500/15 text-blue-300' },
  contrato_enviado: { label: 'Contrato Enviado', short: 'Contrato env.', className: 'bg-purple-500/15 text-purple-300' },
  contrato_assinado: { label: 'Contrato Assinado', short: 'Contrato ass.', className: 'bg-indigo-500/15 text-indigo-300' },
  pagamento_pendente: { label: 'Pagamento Pendente', short: 'Pag. pendente', className: 'bg-orange-400/15 text-orange-300' },
  pagamento_confirmado: { label: 'Pagamento Confirmado', short: 'Pag. confirmado', className: 'bg-on-lime/15 text-on-lime' },
  ativo: { label: 'Ativo', short: 'Ativo', className: 'bg-on-lime/15 text-on-lime' },
  suspenso: { label: 'Suspenso', short: 'Suspenso', className: 'bg-amber-400/15 text-amber-300' },
  cancelado: { label: 'Cancelado', short: 'Cancelado', className: 'bg-red-500/15 text-red-300' },
};

const dateValue = (s: string) => {
  const t = new Date(s.split('/').reverse().join('-')).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const AdminClients = () => {
  const { clients, loading, error, refetch } = useAdminClients();

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPlanosModalOpen, setIsPlanosModalOpen] = useState(false);
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

  // Filter clients (ordenação fica no DataView)
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
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

      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      const matchesPlan = planFilter === 'all' || client.plan === planFilter;
      const matchesCity = cityFilter === 'all' || client.cidade === cityFilter;
      const matchesState = stateFilter === 'all' || client.estado === stateFilter;
      const matchesType = typeFilter === 'all' || client.tipo_pessoa === typeFilter;

      return matchesSearch && matchesStatus && matchesPlan && matchesCity && matchesState && matchesType;
    });
  }, [clients, searchTerm, statusFilter, planFilter, cityFilter, stateFilter, typeFilter]);

  const clientStats = useMemo(() => ({
    total: clients.length,
    iniciado: clients.filter(c => c.status === 'iniciado').length,
    ativo: clients.filter(c => c.status === 'ativo').length,
    pagamento_pendente: clients.filter(c => c.status === 'pagamento_pendente').length,
    cancelado: clients.filter(c => c.status === 'cancelado').length,
    filtered: filteredClients.length
  }), [clients, filteredClients]);

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

  const handlePlanosClient = (client: AdminClient) => {
    setSelectedClient(client);
    setIsPlanosModalOpen(true);
  };

  const handleFormSuccess = () => {
    refetch();
  };

  const handleDeleteSuccess = () => {
    refetch();
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPlanFilter('all');
    setCityFilter('all');
    setStateFilter('all');
    setTypeFilter('all');
  };

  const getStatusLabel = (status: AdminClient['status']) => STATUS_CONFIG[status]?.label || 'Desconhecido';

  // Export functionality
  const exportToCSV = () => {
    const headers = [
      'Nome', 'Email', 'Telefone', 'CPF/CNPJ', 'Tipo Pessoa',
      'Endereço', 'Cidade', 'Estado', 'CEP', 'Plano', 'Status',
      'Data Adesão', 'Próximo Vencimento'
    ];

    const csvData = filteredClients.map(client => [
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
      description: `${filteredClients.length} clientes exportados para CSV.`,
    });
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

  const renderStatusPill = (client: AdminClient, useShort = false) => {
    const config = STATUS_CONFIG[client.status];
    if (!config) return <span className="on-pill bg-white/10 text-muted-foreground">—</span>;
    return (
      <span className={`on-pill whitespace-nowrap text-[11px] ${config.className}`} title={config.label}>
        {useShort ? config.short : config.label}
      </span>
    );
  };

  const renderTypePill = (client: AdminClient) => (
    <span
      className={`on-pill text-[10px] ${
        client.tipo_pessoa === 'juridica' ? 'bg-on-lime/15 text-on-lime' : 'bg-white/10 text-muted-foreground'
      }`}
    >
      {client.tipo_pessoa === 'juridica' ? 'PJ' : 'PF'}
    </span>
  );

  const renderActions = (client: AdminClient) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações do cliente">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => handleViewClient(client)} className="cursor-pointer">
          <Eye className="mr-2 h-4 w-4" /> Ver detalhes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEditClient(client)} className="cursor-pointer">
          <Edit className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePlanosClient(client)} className="cursor-pointer">
          <CreditCard className="mr-2 h-4 w-4" /> Gerenciar planos
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDeleteClient(client)}
          className="cursor-pointer text-red-400 focus:text-red-300"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: DataViewColumn<AdminClient>[] = [
    {
      key: 'name',
      header: 'Cliente',
      sortValue: (c) => c.name.toLowerCase(),
      headClassName: 'w-[24%]',
      render: (c) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {renderTypePill(c)}
            <span className="truncate font-medium text-foreground" title={c.name}>{c.name}</span>
          </div>
          <div className="on-num truncate text-xs text-muted-foreground" title={c.tipo_pessoa === 'juridica' ? c.cnpj : c.cpf_responsavel}>
            {c.tipo_pessoa === 'juridica' ? c.cnpj : c.cpf_responsavel}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Contato',
      sortValue: (c) => c.email.toLowerCase(),
      headClassName: 'w-[22%]',
      render: (c) => (
        <div className="min-w-0">
          <div className="truncate text-foreground" title={c.email}>{c.email}</div>
          <div className="on-num text-xs text-muted-foreground">{c.telefone}</div>
        </div>
      ),
    },
    {
      key: 'cidade',
      header: 'Local',
      sortValue: (c) => `${c.cidade} ${c.estado}`.toLowerCase(),
      headClassName: 'hidden w-[13%] lg:table-cell',
      cellClassName: 'hidden lg:table-cell',
      render: (c) => (
        <span className="block truncate text-muted-foreground" title={`${c.cidade} · ${c.estado}`}>
          {c.cidade} · {c.estado}
        </span>
      ),
    },
    {
      key: 'plan',
      header: 'Plano',
      sortValue: (c) => c.plan.toLowerCase(),
      headClassName: 'hidden w-[17%] md:table-cell',
      cellClassName: 'hidden md:table-cell',
      render: (c) => (
        <span className="block truncate text-muted-foreground" title={c.plan}>{c.plan}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (c) => c.status,
      headClassName: 'w-[12%]',
      render: (c) => renderStatusPill(c, true),
    },
    {
      key: 'nextDue',
      header: 'Venc.',
      sortValue: (c) => dateValue(c.nextDue),
      headClassName: 'hidden w-[9%] xl:table-cell',
      cellClassName: 'hidden xl:table-cell',
      render: (c) => <span className="on-num text-xs text-muted-foreground">{c.nextDue}</span>,
    },
    {
      key: 'actions',
      header: '',
      headClassName: 'w-12',
      cellClassName: 'text-right',
      render: (c) => renderActions(c),
    },
  ];

  const renderClientCard = (client: AdminClient) => (
    <div className="on-card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {renderTypePill(client)}
            <span className="truncate font-semibold text-foreground" title={client.name}>{client.name}</span>
          </div>
          <div className="on-num mt-0.5 truncate text-xs text-muted-foreground">
            {client.tipo_pessoa === 'juridica' ? client.cnpj : client.cpf_responsavel}
          </div>
        </div>
        {renderActions(client)}
      </div>

      <dl className="grid grid-cols-1 gap-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Email</dt>
          <dd className="truncate text-foreground" title={client.email}>{client.email}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Telefone</dt>
          <dd className="on-num text-foreground">{client.telefone}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Local</dt>
          <dd className="truncate text-foreground" title={`${client.cidade} · ${client.estado}`}>
            {client.cidade} · {client.estado}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Plano</dt>
          <dd className="truncate text-foreground" title={client.plan}>{client.plan}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Adesão</dt>
          <dd className="on-num text-foreground">{client.joinDate}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Vencimento</dt>
          <dd className="on-num text-foreground">{client.nextDue}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Correspondências</dt>
          <dd className="on-num text-foreground">{client.correspondences}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
        {renderStatusPill(client)}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Clientes</h1>
          <p className="text-muted-foreground">Carregando todos os registros...</p>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Clientes</h1>
          <p className="text-muted-foreground">Erro ao carregar dados</p>
        </div>
        <div className="text-center py-12">
          <p className="text-red-400">Erro ao carregar clientes: {error}</p>
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
          <h1 className="text-3xl font-bold text-foreground mb-1">Clientes</h1>
          <p className="text-muted-foreground">
            Todos os <span className="on-num">{clients.length}</span> registros de contratações
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
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Filtros e Pesquisa</CardTitle>
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
        <CardContent className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-4 h-4" />
            <Input
              placeholder="Buscar por nome, CNPJ/CPF, email, cidade, endereço, telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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

            <Select value={planFilter} onValueChange={setPlanFilter}>
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

            <Select value={cityFilter} onValueChange={setCityFilter}>
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

            <Select value={stateFilter} onValueChange={setStateFilter}>
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

            <Select value={typeFilter} onValueChange={setTypeFilter}>
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
            <div className="on-num text-xl font-bold text-foreground">{clientStats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-3">
            <div className="on-num text-xl font-bold text-on-lime">{clientStats.ativo}</div>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-3">
            <div className="on-num text-xl font-bold text-blue-400">{clientStats.iniciado}</div>
            <p className="text-xs text-muted-foreground">Iniciados</p>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-3">
            <div className="on-num text-xl font-bold text-orange-300">{clientStats.pagamento_pendente}</div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-3">
            <div className="on-num text-xl font-bold text-red-400">{clientStats.cancelado}</div>
            <p className="text-xs text-muted-foreground">Cancelados</p>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-3">
            <div className="on-num text-xl font-bold text-purple-300">{clientStats.filtered}</div>
            <p className="text-xs text-muted-foreground">Filtrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Registros */}
      <Card className="on-card overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">
            Registros (<span className="on-num">{filteredClients.length}</span> de{' '}
            <span className="on-num">{clients.length}</span>)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3">
          <DataView<AdminClient>
            data={filteredClients}
            columns={columns}
            getRowId={(c) => c.id}
            renderCard={renderClientCard}
            storageKey="admin-clients"
            initialSort={{ key: 'name', direction: 'asc' }}
            pageSizeOptions={[25, 50, 100]}
            emptyState={
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum cliente encontrado com os filtros aplicados.</p>
                <p className="mt-2 text-sm text-muted-foreground/70">
                  Total na base: <span className="on-num">{clients.length}</span> registros
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Input oculto para importação rápida via n8n */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

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

      {selectedClient && (
        <ClientPlanosModal
          isOpen={isPlanosModalOpen}
          onClose={() => setIsPlanosModalOpen(false)}
          client={selectedClient}
          onUpdate={handleFormSuccess}
        />
      )}

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
