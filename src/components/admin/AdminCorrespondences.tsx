
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Upload, Eye, Download, Calendar, Mail, User, Tag } from 'lucide-react';

const AdminCorrespondences = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const correspondences = [
    {
      id: 1,
      client: 'Empresa Silva LTDA',
      sender: 'Receita Federal',
      subject: 'Notificação de Regularização Fiscal',
      date: '2024-06-01',
      status: 'new',
      category: 'fiscal',
    },
    {
      id: 2,
      client: 'Inovação Tech LTDA',
      sender: 'Prefeitura Municipal',
      subject: 'IPTU 2024 - Carnê de Pagamento',
      date: '2024-05-28',
      status: 'sent',
      category: 'municipal',
    },
    {
      id: 3,
      client: 'Consultoria XYZ',
      sender: 'SEFAZ-SP',
      subject: 'Alteração Cadastral Aprovada',
      date: '2024-05-25',
      status: 'viewed',
      category: 'estadual',
    },
    {
      id: 4,
      client: 'Serviços Gerais LTDA',
      sender: 'Banco Central',
      subject: 'Comunicado sobre PIX Empresarial',
      date: '2024-05-22',
      status: 'sent',
      category: 'bancario',
    },
    {
      id: 5,
      client: 'Empresa Silva LTDA',
      sender: 'Ministério do Trabalho',
      subject: 'eSocial - Pendências Encontradas',
      date: '2024-05-20',
      status: 'viewed',
      category: 'trabalhista',
    },
  ];

  const filteredCorrespondences = correspondences.filter(correspondence => {
    const matchesSearch = correspondence.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         correspondence.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         correspondence.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || correspondence.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { label: 'Nova', className: 'bg-blue-100 text-blue-800' },
      sent: { label: 'Enviada', className: 'bg-yellow-100 text-yellow-800' },
      viewed: { label: 'Visualizada', className: 'bg-green-100 text-green-800' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      fiscal: { className: 'bg-red-50 text-red-800' },
      municipal: { className: 'bg-blue-50 text-blue-800' },
      estadual: { className: 'bg-green-50 text-green-800' },
      bancario: { className: 'bg-purple-50 text-purple-800' },
      trabalhista: { className: 'bg-orange-50 text-orange-800' },
    };
    
    const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.fiscal;
    return <Badge className={config.className}>{category}</Badge>;
  };

  const handleViewCorrespondence = (id: number) => {
    console.log(`Visualizando correspondência ${id}`);
  };

  const handleDownloadCorrespondence = (id: number) => {
    console.log(`Baixando correspondência ${id}`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Correspondências</h1>
          <p className="text-gray-600">
            Gerenciamento de todas as correspondências recebidas
          </p>
        </div>
        <Button className="on-button flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Nova Correspondência
        </Button>
      </div>

      {/* Filters */}
      <Card className="on-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por cliente, remetente ou assunto..."
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
                  <SelectItem value="new">Novas</SelectItem>
                  <SelectItem value="sent">Enviadas</SelectItem>
                  <SelectItem value="viewed">Visualizadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Correspondence Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-on-lime">{correspondences.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {correspondences.filter(c => c.status === 'new').length}
            </div>
            <div className="text-sm text-gray-600">Novas</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {correspondences.filter(c => c.status === 'sent').length}
            </div>
            <div className="text-sm text-gray-600">Enviadas</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {correspondences.filter(c => c.status === 'viewed').length}
            </div>
            <div className="text-sm text-gray-600">Visualizadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Correspondences List */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Lista de Correspondências</CardTitle>
          <CardDescription>
            {filteredCorrespondences.length} correspondências encontradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredCorrespondences.map((correspondence) => (
            <Card key={correspondence.id} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <Mail className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-on-dark">
                          {correspondence.subject}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getCategoryBadge(correspondence.category)}
                          {getStatusBadge(correspondence.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>Cliente: {correspondence.client}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Tag className="w-4 h-4 text-gray-500" />
                        <span>Remetente: {correspondence.sender}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>Data: {correspondence.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCorrespondence(correspondence.id)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Visualizar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownloadCorrespondence(correspondence.id)}
                      className="flex items-center gap-2 on-button"
                    >
                      <Download className="w-4 h-4" />
                      Baixar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredCorrespondences.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Mail className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Nenhuma correspondência encontrada</h3>
          <p className="mt-2 text-gray-500">
            Tente ajustar os filtros ou termos de busca.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminCorrespondences;
