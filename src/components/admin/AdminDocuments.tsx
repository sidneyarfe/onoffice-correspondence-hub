
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, FileText, Download, Eye, Trash2 } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import NewDocumentModal from './NewDocumentModal';

const AdminDocuments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const { documents, loading, error, refetch, deleteDocument, getFileUrl } = useDocuments();
  const { toast } = useToast();

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleView = async (document: any) => {
    try {
      const url = await getFileUrl(document.file_path);
      if (url) {
        window.open(url, '_blank');
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível obter a URL do arquivo",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao visualizar documento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível visualizar o documento",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (document: any) => {
    try {
      const url = await getFileUrl(document.file_path);
      if (url) {
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.name;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível obter a URL do arquivo",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o documento",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      await deleteDocument(documentId);
      toast({
        title: "Sucesso",
        description: "Documento excluído com sucesso"
      });
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir documento",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando documentos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refetch}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Documentos Fiscais</h1>
          <p className="text-gray-600">
            Gerencie os documentos fiscais disponibilizados aos clientes
          </p>
        </div>
        <Button 
          className="on-button flex items-center gap-2" 
          onClick={() => setIsNewModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Novo Documento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-on-lime">{documents.length}</div>
            <div className="text-sm text-gray-600">Total de Documentos</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {documents.reduce((total, doc) => total + (doc.file_size || 0), 0) / 1024 / 1024}
            </div>
            <div className="text-sm text-gray-600">MB Armazenados</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredDocuments.length}
            </div>
            <div className="text-sm text-gray-600">Encontrados</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="on-card">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Lista de Documentos</CardTitle>
          <CardDescription>
            {filteredDocuments.length} documentos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-on-dark text-lg">
                        {document.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {document.file_type && (
                          <Badge variant="outline">{document.file_type}</Badge>
                        )}
                        {document.file_size && (
                          <Badge className="bg-blue-100 text-blue-800">
                            {(document.file_size / 1024 / 1024).toFixed(2)} MB
                          </Badge>
                        )}
                      </div>
                      {document.description && (
                        <p className="text-gray-600 text-sm mt-2">
                          {document.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Criado em: {new Date(document.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(document)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(document)}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Baixar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(document.id)}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <FileText className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Nenhum documento encontrado</h3>
          <p className="mt-2 text-gray-500">
            {documents.length === 0 
              ? "Comece adicionando um novo documento fiscal."
              : "Tente ajustar os termos de busca."
            }
          </p>
        </div>
      )}

      {/* Modal */}
      <NewDocumentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
};

export default AdminDocuments;
