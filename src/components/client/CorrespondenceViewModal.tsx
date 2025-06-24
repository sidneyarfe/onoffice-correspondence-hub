
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Correspondencia } from '@/hooks/useCorrespondencias';
import { Calendar, Tag, Download, FileText } from 'lucide-react';

interface CorrespondenceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  correspondence: Correspondencia | null;
  onDownload: (correspondence: Correspondencia) => void;
}

const CorrespondenceViewModal: React.FC<CorrespondenceViewModalProps> = ({
  isOpen,
  onClose,
  correspondence,
  onDownload
}) => {
  if (!correspondence) return null;

  const getCategoryColor = (category: string) => {
    const colors = {
      fiscal: 'bg-red-100 text-red-800',
      municipal: 'bg-blue-100 text-blue-800',
      estadual: 'bg-green-100 text-green-800',
      bancario: 'bg-purple-100 text-purple-800',
      trabalhista: 'bg-orange-100 text-orange-800',
      geral: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes da Correspondência</span>
            <Badge className={getCategoryColor(correspondence.categoria)}>
              {correspondence.categoria}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Informações da Correspondência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Assunto</h4>
                <p className="text-gray-900 text-lg">{correspondence.assunto}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <div>
                    <h4 className="font-medium text-gray-700">Remetente</h4>
                    <p className="text-gray-900">{correspondence.remetente}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <h4 className="font-medium text-gray-700">Data de Recebimento</h4>
                    <p className="text-gray-900">
                      {new Date(correspondence.data_recebimento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Descrição */}
          {correspondence.descricao && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {correspondence.descricao}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Anexo */}
          {correspondence.arquivo_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Arquivo Anexo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Documento anexado</p>
                      <p className="text-sm text-gray-600">Clique para baixar o arquivo</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => onDownload(correspondence)}
                    className="flex items-center gap-2 on-button"
                  >
                    <Download className="w-4 h-4" />
                    Baixar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="font-medium">Correspondência visualizada</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CorrespondenceViewModal;
