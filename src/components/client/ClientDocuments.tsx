
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Clock, CheckCircle, X, MapPin } from 'lucide-react';
import { useDocumentosDisponibilidade } from '@/hooks/useDocumentosDisponibilidade';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminDocument {
  id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  arquivo_url: string | null;
  disponivel_por_padrao: boolean;
  created_at: string;
  updated_at: string;
}

const ClientDocuments = () => {
  const [adminDocuments, setAdminDocuments] = useState<AdminDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const { isDocumentoDisponivel, loading } = useDocumentosDisponibilidade();
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminDocuments();
  }, []);

  const fetchAdminDocuments = async () => {
    try {
      setLoadingDocs(true);
      const { data, error } = await supabase
        .from('documentos_admin')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminDocuments(data || []);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documentos",
        variant: "destructive"
      });
    } finally {
      setLoadingDocs(false);
    }
  };

  const getStatusIcon = (tipo: string) => {
    if (!isDocumentoDisponivel(tipo)) {
      return <X className="w-4 h-4 text-red-500" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusBadge = (tipo: string) => {
    if (!isDocumentoDisponivel(tipo)) {
      return <Badge className="bg-red-100 text-red-800">Indisponível</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Disponível</Badge>;
  };

  const handleDownload = async (document: AdminDocument) => {
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
        // Criar link temporário para download
        const link = document.createElement('a');
        link.href = data.publicUrl;
        link.download = document.nome;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

  const handleView = async (document: AdminDocument) => {
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

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(k));
    return parseFloat((sizeInBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading || loadingDocs) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando documentos...</p>
        </div>
      </div>
    );
  }

  // Filtrar documentos disponíveis para o cliente
  const availableDocuments = adminDocuments.filter(doc => 
    isDocumentoDisponivel(doc.tipo)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Meus Documentos</h1>
        <p className="text-gray-600">
          Acesse os documentos fiscais e comprobatórios do seu endereço comercial
        </p>
      </div>

      {/* Endereço Fiscal Card */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-on-lime/10 rounded-lg">
              <MapPin className="w-5 h-5 text-on-lime" />
            </div>
            Endereço Fiscal ON Office
          </CardTitle>
          <CardDescription>
            Seu endereço comercial oficial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">Centro Empresarial ON Office</p>
              <p className="text-gray-600">Av. Generalíssimo Deodoro, 1893 - Nazaré</p>
              <p className="text-gray-600">Belém - PA, CEP: 66040-140</p>
              <p className="text-gray-600">Tel: (91) 99246-3050</p>
            </div>
            
            <div className="pt-3 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Horário de funcionamento:</p>
                  <p className="text-gray-600">Segunda a Sexta - 08:00 às 19:00, Sábado - 08:00 às 13:00</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Atendimento fiscal:</p>
                  <p className="text-gray-600">Nossa equipe está preparada para receber fiscalizações</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Documentos do Endereço Fiscal</h3>
              <p className="text-blue-800 text-sm mb-3">
                Todos os documentos listados são referentes ao seu plano contratado de Endereço Fiscal da ON Office, 
                que servirá como seu endereço fiscal (formalização) e comercial (divulgação). Estes documentos podem 
                ser utilizados para comprovações junto a órgãos fiscalizadores e divulgação para redes sociais e publicidade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div className="grid gap-6">
        {adminDocuments.map(documento => (
          <Card key={documento.id} className="on-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg mb-1 flex items-center gap-2">
                      {documento.nome}
                      {getStatusIcon(documento.tipo)}
                    </CardTitle>
                    <CardDescription className="mb-2">
                      {documento.descricao || 'Documento do endereço fiscal'}
                    </CardDescription>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Atualizado em {new Date(documento.updated_at).toLocaleDateString('pt-BR')}</span>
                      {documento.arquivo_url && (
                        <>
                          <span>•</span>
                          <span>Arquivo disponível</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {getStatusBadge(documento.tipo)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {isDocumentoDisponivel(documento.tipo) ? (
                  <>
                    {documento.arquivo_url ? (
                      <>
                        <Button 
                          size="sm" 
                          className="bg-on-lime hover:bg-on-lime/90"
                          onClick={() => handleDownload(documento)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleView(documento)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          Documento sem arquivo anexo no momento.
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <X className="w-4 h-4" />
                    <span className="text-sm">
                      Este documento não está disponível para sua conta no momento.
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {adminDocuments.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <FileText className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Nenhum documento disponível</h3>
          <p className="mt-2 text-gray-500">
            Os documentos serão disponibilizados conforme configurado pela administração.
          </p>
        </div>
      )}

      {/* Help Section */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-on-lime" />
            Precisa de Ajuda?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              <strong>Documentos em falta:</strong> Caso algum documento não esteja disponível, 
              entre em contato conosco através do telefone (91) 99246-3050.
            </p>
            <p>
              <strong>Atualizações:</strong> Os documentos são atualizados automaticamente 
              sempre que há renovações ou alterações nos órgãos competentes.
            </p>
            <p>
              <strong>Validade:</strong> Todos os documentos apresentados estão dentro do 
              prazo de validade e podem ser utilizados para fins comerciais e fiscais.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDocuments;
