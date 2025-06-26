
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, FileText, Users, Settings, Trash2, Download, Eye, Edit } from 'lucide-react';
import DocumentFormModal from './DocumentFormModal';
import ClientDocumentAccessModal from './ClientDocumentAccessModal';

interface Document {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  arquivo_url: string | null;
  disponivel_por_padrao: boolean;
  created_at: string;
  updated_at: string;
}

const AdminDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [accessDocumentType, setAccessDocumentType] = useState('');
  const [accessDocumentName, setAccessDocumentName] = useState('');
  const { toast } = useToast();

  const defaultDocuments = [
    { tipo: 'AVCB', nome: 'Auto de Vistoria do Corpo de Bombeiros', descricao: 'Documento de segurança contra incêndios' },
    { tipo: 'IPTU', nome: 'Imposto Predial e Territorial Urbano', descricao: 'Comprovante de pagamento do IPTU' },
    { tipo: 'INSCRICAO_ESTADUAL', nome: 'Inscrição Estadual', descricao: 'Documento de inscrição estadual da empresa' }
  ];

  useEffect(() => {
    fetchDocuments();
    initializeDefaultDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos_admin')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultDocuments = async () => {
    try {
      const { data: existingDocs } = await supabase
        .from('documentos_admin')
        .select('tipo')
        .in('tipo', defaultDocuments.map(d => d.tipo));

      const existingTypes = existingDocs?.map(d => d.tipo) || [];
      const docsToCreate = defaultDocuments.filter(d => !existingTypes.includes(d.tipo));

      if (docsToCreate.length > 0) {
        const { error } = await supabase
          .from('documentos_admin')
          .insert(docsToCreate.map(doc => ({
            tipo: doc.tipo,
            nome: doc.nome,
            descricao: doc.descricao,
            disponivel_por_padrao: true
          })));

        if (error) throw error;
        fetchDocuments();
      }
    } catch (error) {
      console.error('Erro ao inicializar documentos padrão:', error);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleView = async (document: Document) => {
    if (!document.arquivo_url) {
      toast({
        title: "Sem arquivo",
        description: "Este documento não possui arquivo anexo",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data } = supabase.storage
        .from('documentos')
        .getPublicUrl(document.arquivo_url);

      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
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

  const handleDownload = async (document: Document) => {
    if (!document.arquivo_url) {
      toast({
        title: "Sem arquivo",
        description: "Este documento não possui arquivo anexo",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data } = supabase.storage
        .from('documentos')
        .getPublicUrl(document.arquivo_url);

      if (data?.publicUrl) {
        const link = window.document.createElement('a');
        link.href = data.publicUrl;
        link.download = document.nome;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
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
      const document = documents.find(d => d.id === documentId);
      
      // Deletar arquivo do storage se existir
      if (document?.arquivo_url) {
        await supabase.storage
          .from('documentos')
          .remove([document.arquivo_url]);
      }

      const { error } = await supabase
        .from('documentos_admin')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== documentId));
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

  const handleNewDocument = () => {
    setSelectedDocument(null);
    setIsFormModalOpen(true);
  };

  const handleEditDocument = (document: Document) => {
    setSelectedDocument(document);
    setIsFormModalOpen(true);
  };

  const handleManageAccess = (document: Document) => {
    setAccessDocumentType(document.tipo);
    setAccessDocumentName(document.nome);
    setIsAccessModalOpen(true);
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

  const totalDocuments = documents.length;
  const documentsWithFile = documents.filter(d => d.arquivo_url).length;
  const defaultDocs = documents.filter(d => d.disponivel_por_padrao).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Documentos</h1>
          <p className="text-gray-600">
            Gerencie os documentos disponibilizados aos clientes
          </p>
        </div>
        <Button className="on-button flex items-center gap-2" onClick={handleNewDocument}>
          <Plus className="w-4 h-4" />
          Novo Documento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-on-lime">{totalDocuments}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{defaultDocs}</div>
            <div className="text-sm text-gray-600">Padrão</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{documentsWithFile}</div>
            <div className="text-sm text-gray-600">Com Arquivo</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {totalDocuments - documentsWithFile}
            </div>
            <div className="text-sm text-gray-600">Sem Arquivo</div>
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
                        {document.nome}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{document.tipo}</Badge>
                        {document.disponivel_por_padrao && (
                          <Badge className="bg-green-100 text-green-800">Padrão</Badge>
                        )}
                        {document.arquivo_url && (
                          <Badge className="bg-blue-100 text-blue-800">Com Arquivo</Badge>
                        )}
                      </div>
                      {document.descricao && (
                        <p className="text-gray-600 text-sm mt-2">
                          {document.descricao}
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
                      className="flex items-center gap-2"
                      onClick={() => handleManageAccess(document)}
                    >
                      <Users className="w-4 h-4" />
                      Acessos
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-2"
                      onClick={() => handleEditDocument(document)}
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </Button>
                    {document.arquivo_url && (
                      <>
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
                      </>
                    )}
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
            Tente ajustar os termos de busca ou crie um novo documento.
          </p>
        </div>
      )}

      {/* Modals */}
      <DocumentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        document={selectedDocument}
        onSuccess={fetchDocuments}
      />

      <ClientDocumentAccessModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        documentType={accessDocumentType}
        documentName={accessDocumentName}
      />
    </div>
  );
};

export default AdminDocuments;
