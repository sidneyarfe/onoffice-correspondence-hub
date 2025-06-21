
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Shield, MapPin, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Documento {
  id: string;
  nome_documento: string;
  tipo: string;
  descricao: string | null;
  data_atualizacao: string;
  tamanho_kb: number | null;
  arquivo_url: string | null;
}

const ClientDocuments = () => {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [contratacao, setContratacao] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        // Buscar documentos do cliente
        const { data: docs } = await supabase
          .from('documentos_cliente')
          .select('*')
          .eq('user_id', user.id)
          .order('data_atualizacao', { ascending: false });

        // Buscar dados da contratação para o endereço fiscal
        const { data: contrat } = await supabase
          .from('contratacoes_clientes')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setDocumentos(docs || []);
        setContratacao(contrat);

        // Registrar atividade
        await supabase.rpc('registrar_atividade', {
          p_user_id: user.id,
          p_acao: 'documentos_acesso',
          p_descricao: 'Usuário acessou a área de documentos'
        });
      } catch (error) {
        console.error('Erro ao buscar documentos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleDownload = async (documento: Documento) => {
    if (!user?.id) return;

    // Registrar atividade de download
    await supabase.rpc('registrar_atividade', {
      p_user_id: user.id,
      p_acao: 'documento_download',
      p_descricao: `Download do documento: ${documento.nome_documento}`
    });

    // Simular download (em produção, faria o download real)
    console.log(`Baixando documento: ${documento.nome_documento}`);
  };

  const getDocumentIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'iptu':
        return MapPin;
      case 'avcb':
        return Shield;
      case 'inscricao_estadual':
        return Building;
      default:
        return FileText;
    }
  };

  const getDocumentColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'iptu':
        return { color: 'text-blue-600', bgColor: 'bg-blue-50' };
      case 'avcb':
        return { color: 'text-red-600', bgColor: 'bg-red-50' };
      case 'inscricao_estadual':
        return { color: 'text-green-600', bgColor: 'bg-green-50' };
      default:
        return { color: 'text-gray-600', bgColor: 'bg-gray-50' };
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
          {documentos.length === 0 
            ? 'Seus documentos estarão disponíveis aqui em breve'
            : 'Baixe os documentos da sua empresa sempre que precisar'
          }
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-on-lime/20 bg-on-lime/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-on-lime/20 rounded-full">
              <FileText className="w-6 h-6 text-on-lime" />
            </div>
            <div>
              <h3 className="font-semibold text-on-dark mb-2">Documentos Sempre Atualizados</h3>
              <p className="text-gray-600 text-sm">
                {documentos.length === 0 
                  ? 'Nossa equipe está preparando seus documentos. Eles aparecerão aqui quando estiverem prontos.'
                  : 'Todos os documentos são mantidos atualizados pela nossa equipe. Você pode fazer o download quantas vezes precisar, sempre terá a versão mais recente.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      {documentos.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-6">
          {documentos.map((documento) => {
            const Icon = getDocumentIcon(documento.tipo);
            const { color, bgColor } = getDocumentColor(documento.tipo);
            
            return (
              <Card key={documento.id} className="on-card hover:shadow-2xl transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto mb-4 p-4 rounded-full w-fit ${bgColor}`}>
                    <Icon className={`w-8 h-8 ${color}`} />
                  </div>
                  <CardTitle className="text-xl text-on-dark">{documento.nome_documento}</CardTitle>
                  <CardDescription className="text-gray-600">
                    {documento.descricao || 'Documento oficial da empresa'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Última atualização:</span>
                      <span className="font-medium">
                        {new Date(documento.data_atualizacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {documento.tamanho_kb && (
                      <div className="flex justify-between">
                        <span>Tamanho:</span>
                        <span className="font-medium">{documento.tamanho_kb} KB</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full on-button"
                    onClick={() => handleDownload(documento)}
                    disabled={!documento.arquivo_url}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="on-card">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-on-dark mb-2">Documentos em Preparação</h3>
            <p className="text-gray-600 mb-6">
              Nossa equipe está preparando seus documentos oficiais. 
              Eles aparecerão aqui assim que estiverem prontos para download.
            </p>
            <div className="text-sm text-gray-500">
              Tempo estimado: 1-2 dias úteis após a contratação
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Info */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-on-dark mb-2">Endereço Fiscal</h4>
              {contratacao ? (
                <p className="text-gray-600 text-sm">
                  {contratacao.endereco}, {contratacao.numero_endereco}
                  {contratacao.complemento_endereco && ` - ${contratacao.complemento_endereco}`}<br />
                  {contratacao.bairro && `${contratacao.bairro} - `}
                  {contratacao.cidade} - {contratacao.estado}<br />
                  CEP: {contratacao.cep}
                </p>
              ) : (
                <p className="text-gray-600 text-sm">Carregando informações...</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-on-dark mb-2">Suporte</h4>
              <p className="text-gray-600 text-sm">
                Precisa de algum documento específico?<br />
                Entre em contato conosco:<br />
                <a href="mailto:suporte@onoffice.com" className="text-on-lime hover:underline">
                  suporte@onoffice.com
                </a><br />
                (11) 3000-0000
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDocuments;
