
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Search, Filter, Mail, Calendar } from 'lucide-react';

const ClientCorrespondences = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  const correspondences = [
    {
      id: 1,
      sender: 'Receita Federal',
      subject: 'Notificação de Regularização Fiscal',
      date: '2024-06-01',
      isNew: true,
      category: 'fiscal',
      description: 'Documentação necessária para regularização do CNPJ',
    },
    {
      id: 2,
      sender: 'Prefeitura Municipal',
      subject: 'IPTU 2024 - Carnê de Pagamento',
      date: '2024-05-28',
      isNew: true,
      category: 'municipal',
      description: 'Carnê do IPTU para o exercício de 2024',
    },
    {
      id: 3,
      sender: 'SEFAZ-SP',
      subject: 'Alteração Cadastral Aprovada',
      date: '2024-05-25',
      isNew: false,
      category: 'estadual',
      description: 'Confirmação de alteração no cadastro estadual',
    },
    {
      id: 4,
      sender: 'Banco Central',
      subject: 'Comunicado sobre PIX Empresarial',
      date: '2024-05-22',
      isNew: false,
      category: 'bancario',
      description: 'Informações sobre novas regras do PIX empresarial',
    },
    {
      id: 5,
      sender: 'Ministério do Trabalho',
      subject: 'eSocial - Pendências Encontradas',
      date: '2024-05-20',
      isNew: false,
      category: 'trabalhista',
      description: 'Relatório de pendências no sistema eSocial',
    },
  ];

  const filteredCorrespondences = correspondences.filter(correspondence => {
    const matchesSearch = correspondence.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         correspondence.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'new' && correspondence.isNew) ||
                         (filter === 'read' && !correspondence.isNew);
    
    return matchesSearch && matchesFilter;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      fiscal: 'bg-red-100 text-red-800',
      municipal: 'bg-blue-100 text-blue-800',
      estadual: 'bg-green-100 text-green-800',
      bancario: 'bg-purple-100 text-purple-800',
      trabalhista: 'bg-orange-100 text-orange-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleView = (correspondenceId: number) => {
    console.log(`Visualizando correspondência ${correspondenceId}`);
    // Em produção, abriria o documento para visualização
  };

  const handleDownload = (correspondenceId: number) => {
    console.log(`Baixando correspondência ${correspondenceId}`);
    // Em produção, faria o download do documento
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Correspondências</h1>
        <p className="text-gray-600">
          Todas as correspondências recebidas em seu endereço fiscal
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-on-lime">{correspondences.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {correspondences.filter(c => c.isNew).length}
            </div>
            <div className="text-sm text-gray-600">Não Lidas</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {correspondences.filter(c => !c.isNew).length}
            </div>
            <div className="text-sm text-gray-600">Lidas</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">30</div>
            <div className="text-sm text-gray-600">Este Mês</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="on-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por remetente ou assunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                size="sm"
              >
                Todas
              </Button>
              <Button
                variant={filter === 'new' ? 'default' : 'outline'}
                onClick={() => setFilter('new')}
                size="sm"
              >
                Não Lidas
              </Button>
              <Button
                variant={filter === 'read' ? 'default' : 'outline'}
                onClick={() => setFilter('read')}
                size="sm"
              >
                Lidas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Correspondences List */}
      <div className="space-y-4">
        {filteredCorrespondences.map((correspondence) => (
          <Card key={correspondence.id} className="on-card hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Mail className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-on-dark">{correspondence.sender}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getCategoryColor(correspondence.category)}>
                          {correspondence.category}
                        </Badge>
                        {correspondence.isNew && (
                          <Badge className="bg-red-500 text-white">Nova</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-medium text-on-dark mb-2">
                    {correspondence.subject}
                  </h4>
                  <p className="text-gray-600 text-sm mb-3">
                    {correspondence.description}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{correspondence.date}</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(correspondence.id)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Visualizar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(correspondence.id)}
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
      </div>

      {filteredCorrespondences.length === 0 && (
        <Card className="on-card">
          <CardContent className="p-12 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma correspondência encontrada
            </h3>
            <p className="text-gray-600">
              Tente ajustar os filtros ou termos de busca.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientCorrespondences;
