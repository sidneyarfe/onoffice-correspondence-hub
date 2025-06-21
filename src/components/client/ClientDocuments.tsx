import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Clock, CheckCircle, X, MapPin } from 'lucide-react';
import { useDocumentosDisponibilidade } from '@/hooks/useDocumentosDisponibilidade';
const ClientDocuments = () => {
  const {
    isDocumentoDisponivel,
    loading
  } = useDocumentosDisponibilidade();
  const documentos = [{
    id: 'iptu',
    tipo: 'IPTU',
    nome: 'IPTU - Imposto Predial e Territorial Urbano',
    descricao: 'Comprovante de pagamento do IPTU do endereço fiscal',
    status: 'disponivel',
    dataAtualizacao: '2024-03-15',
    tamanho: '245 KB'
  }, {
    id: 'avcb',
    tipo: 'AVCB',
    nome: 'AVCB - Auto de Vistoria do Corpo de Bombeiros',
    descricao: 'Certificado de vistoria dos bombeiros para o endereço fiscal',
    status: 'disponivel',
    dataAtualizacao: '2024-02-20',
    tamanho: '1.2 MB'
  }, {
    id: 'inscricao_estadual',
    tipo: 'INSCRICAO_ESTADUAL',
    nome: 'Inscrição Estadual',
    descricao: 'Comprovante de inscrição estadual ativa',
    status: 'disponivel',
    dataAtualizacao: '2024-03-10',
    tamanho: '180 KB'
  }];
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
  if (loading) {
    return <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando documentos...</p>
        </div>
      </div>;
  }
  return <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Meus Documentos</h1>
        <p className="text-gray-600">
          Acesse os documentos fiscais e comprobatórios do seu endereço comercial
        </p>
      </div>

      {/* Endereço Fiscal Card - Moved from profile */}
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

      {/* Important Notice - Moved to top */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Documentos do Endereço Fiscal</h3>
              <p className="text-blue-800 text-sm mb-3">Todos os documentos listados são referentes ao seu plano contratado de Endereço Fiscal da ON Office, que servirá como seu endereço fiscal (formalização) e comercial (divulgação). Estes documentos podem ser utilizados para comprovações junto a órgãos fiscalizadores e divulgação para redes sociais e p</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div className="grid gap-6">
        {documentos.map(documento => <Card key={documento.id} className="on-card">
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
                      {documento.descricao}
                    </CardDescription>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Atualizado em {new Date(documento.dataAtualizacao).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{documento.tamanho}</span>
                    </div>
                  </div>
                </div>
                {getStatusBadge(documento.tipo)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {isDocumentoDisponivel(documento.tipo) ? <>
                    <Button size="sm" className="bg-on-lime hover:bg-on-lime/90">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                  </> : <div className="flex items-center gap-2 text-red-600">
                    <X className="w-4 h-4" />
                    <span className="text-sm">
                      Este documento não está disponível para sua conta no momento.
                    </span>
                  </div>}
              </div>
            </CardContent>
          </Card>)}
      </div>

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
    </div>;
};
export default ClientDocuments;