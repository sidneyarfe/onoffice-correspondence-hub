
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Shield, MapPin } from 'lucide-react';

const ClientDocuments = () => {
  const documents = [
    {
      name: 'IPTU 2024',
      description: 'Imposto Predial e Territorial Urbano',
      icon: MapPin,
      lastUpdate: '01/01/2024',
      size: '245 KB',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'AVCB',
      description: 'Auto de Vistoria do Corpo de Bombeiros',
      icon: Shield,
      lastUpdate: '15/03/2024',
      size: '512 KB',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      name: 'Inscrição Estadual',
      description: 'Documento de Inscrição Estadual',
      icon: FileText,
      lastUpdate: '10/02/2024',
      size: '189 KB',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  const handleDownload = (documentName: string) => {
    // Simular download
    console.log(`Baixando documento: ${documentName}`);
    // Em produção, isso faria o download real do documento
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Meus Documentos</h1>
        <p className="text-gray-600">
          Baixe os documentos padrão da sua empresa sempre que precisar
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
                Todos os documentos são mantidos atualizados pela nossa equipe. 
                Você pode fazer o download quantas vezes precisar, sempre terá a versão mais recente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {documents.map((document, index) => (
          <Card key={index} className="on-card hover:shadow-2xl transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className={`mx-auto mb-4 p-4 rounded-full w-fit ${document.bgColor}`}>
                <document.icon className={`w-8 h-8 ${document.color}`} />
              </div>
              <CardTitle className="text-xl text-on-dark">{document.name}</CardTitle>
              <CardDescription className="text-gray-600">
                {document.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Última atualização:</span>
                  <span className="font-medium">{document.lastUpdate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tamanho:</span>
                  <span className="font-medium">{document.size}</span>
                </div>
              </div>
              
              <Button 
                className="w-full on-button"
                onClick={() => handleDownload(document.name)}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Info */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-on-dark mb-2">Endereço Fiscal</h4>
              <p className="text-gray-600 text-sm">
                Rua das Empresas, 123 - Sala 45<br />
                Centro Empresarial ON Office<br />
                São Paulo - SP, 01234-567
              </p>
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
