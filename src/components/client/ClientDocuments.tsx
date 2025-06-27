
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
}

const ClientDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
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

  const getFileUrl = async (filePath: string) => {
    try {
      const { data } = supabase.storage
        .from('documentos_fiscais')
        .getPublicUrl(filePath);

      return data?.publicUrl || null;
    } catch (error) {
      console.error('Erro ao obter URL do arquivo:', error);
      return null;
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const url = await getFileUrl(document.file_path);
      if (url) {
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.name;
        link.target = '_blank';
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

  const handleView = async (document: Document) => {
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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando documentos...</p>
        </div>
      </div>
    );
  }

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
        {documents.map(documento => (
          <Card key={documento.id} className="on-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg mb-1">
                      {documento.name}
                    </CardTitle>
                    <CardDescription className="mb-2">
                      {documento.description || 'Documento do endereço fiscal'}
                    </CardDescription>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Atualizado em {new Date(documento.updated_at).toLocaleDateString('pt-BR')}</span>
                      {documento.file_size && (
                        <>
                          <span>•</span>
                          <span>{(documento.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">Disponível</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <FileText className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Nenhum documento disponível</h3>
          <p className="mt-2 text-gray-500">
            Os documentos serão disponibilizados conforme enviados pela administração.
          </p>
        </div>
      )}

      {/* Help Section */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-on-lime" />
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
