
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Upload, Eye, Download, Calendar, Mail, User, Tag, Edit, Settings } from 'lucide-react';
import { useAdminCorrespondences, AdminCorrespondence } from '@/hooks/useAdminCorrespondences';
import { useCorrespondenceCategories } from '@/hooks/useCorrespondenceCategories';
import CorrespondenceDetailModal from './CorrespondenceDetailModal';
import NewCorrespondenceModal from './NewCorrespondenceModal';
import EditCorrespondenceModal from './EditCorrespondenceModal';
import CategoryManagementModal from './CategoryManagementModal';

const AdminCorrespondences = () => {
  const { correspondences, loading, error, refetch, updateCorrespondenceStatus, deleteCorrespondence } = useAdminCorrespondences();
  const { categories } = useCorrespondenceCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedCorrespondence, setSelectedCorrespondence] = useState<AdminCorrespondence | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCorrespondence, setEditingCorrespondence] = useState<AdminCorrespondence | null>(null);

  const filteredCorrespondences = correspondences.filter(correspondence => {
    const matchesSearch = correspondence.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         correspondence.remetente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         correspondence.assunto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'viewed' && correspondence.visualizada) ||
                         (statusFilter === 'new' && !correspondence.visualizada);
    const matchesCategory = categoryFilter === 'all' || correspondence.categoria === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (visualizada: boolean) => {
    return visualizada ? (
      <Badge className="bg-green-100 text-green-800">Visualizada</Badge>
    ) : (
      <Badge className="bg-blue-100 text-blue-800">Nova</Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryData = categories.find(cat => cat.nome === category);
    const colorClass = categoryData ? `bg-${categoryData.cor}-50 text-${categoryData.cor}-800` : 'bg-gray-50 text-gray-800';
    
    return <Badge className={colorClass}>{category}</Badge>;
  };

  const handleViewCorrespondence = (correspondence: AdminCorrespondence) => {
    setSelectedCorrespondence(correspondence);
    setShowDetailModal(true);
  };

  const handleEditCorrespondence = (correspondence: AdminCorrespondence) => {
    setEditingCorrespondence(correspondence);
    setShowEditModal(true);
  };

  const handleDownloadCorrespondence = (correspondence: AdminCorrespondence) => {
    if (correspondence.arquivo_url) {
      window.open(correspondence.arquivo_url, '_blank');
    } else {
      alert('Esta correspondência não possui arquivo anexo.');
    }
  };

  const handleUpdateStatus = async (id: string, visualizada: boolean) => {
    await updateCorrespondenceStatus(id, visualizada);
    // Atualizar correspondência selecionada se for a mesma
    if (selectedCorrespondence?.id === id) {
      setSelectedCorrespondence(prev => prev ? { ...prev, visualizada } : null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCorrespondence(id);
  };

  const handleNewCorrespondenceSuccess = () => {
    refetch();
  };

  const handleEditSuccess = () => {
    refetch();
    setEditingCorrespondence(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando correspondências...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Erro ao carregar correspondências: {error}</p>
        <Button onClick={refetch}>Tentar Novamente</Button>
      </div>
    );
  }

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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Gerenciar Categorias
          </Button>
          <Button onClick={() => setShowNewModal(true)} className="on-button flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Nova Correspondência
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
                placeholder="Buscar por cliente, remetente ou assunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="new">Novas</SelectItem>
                  <SelectItem value="viewed">Visualizadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.nome}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-${category.cor}-200`}></div>
                        {category.nome}
                      </div>
                    </SelectItem>
                  ))}
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
              {correspondences.filter(c => !c.visualizada).length}
            </div>
            <div className="text-sm text-gray-600">Novas</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {correspondences.filter(c => c.visualizada).length}
            </div>
            <div className="text-sm text-gray-600">Visualizadas</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {correspondences.filter(c => c.arquivo_url).length}
            </div>
            <div className="text-sm text-gray-600">Com Anexo</div>
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
                          {correspondence.assunto}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getCategoryBadge(correspondence.categoria)}
                          {getStatusBadge(correspondence.visualizada)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>Cliente: {correspondence.cliente_nome}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Tag className="w-4 h-4 text-gray-500" />
                        <span>Remetente: {correspondence.remetente}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>Data: {new Date(correspondence.data_recebimento).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCorrespondence(correspondence)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCorrespondence(correspondence)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Visualizar
                    </Button>
                    {correspondence.arquivo_url && (
                      <Button
                        size="sm"
                        onClick={() => handleDownloadCorrespondence(correspondence)}
                        className="flex items-center gap-2 on-button"
                      >
                        <Download className="w-4 h-4" />
                        Baixar
                      </Button>
                    )}
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

      {/* Modals */}
      <CorrespondenceDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCorrespondence(null);
        }}
        correspondence={selectedCorrespondence}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
      />

      <NewCorrespondenceModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={handleNewCorrespondenceSuccess}
      />

      <EditCorrespondenceModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCorrespondence(null);
        }}
        correspondence={editingCorrespondence}
        onSuccess={handleEditSuccess}
      />

      <CategoryManagementModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
    </div>
  );
};

export default AdminCorrespondences;
