
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminCorrespondence } from '@/hooks/useAdminCorrespondences';
import { Calendar, User, Mail, Tag, Eye, EyeOff, Download, Trash2 } from 'lucide-react';

interface CorrespondenceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  correspondence: AdminCorrespondence | null;
  onUpdateStatus: (id: string, visualizada: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CorrespondenceDetailModal: React.FC<CorrespondenceDetailModalProps> = ({
  isOpen,
  onClose,
  correspondence,
  onUpdateStatus,
  onDelete
}) => {
  if (!correspondence) return null;

  const handleToggleStatus = async () => {
    try {
      await onUpdateStatus(correspondence.id, !correspondence.visualizada);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir esta correspondência?')) {
      try {
        await onDelete(correspondence.id);
        onClose();
      } catch (error) {
        console.error('Erro ao excluir correspondência:', error);
      }
    }
  };

  const handleDownload = () => {
    if (correspondence.arquivo_url) {
      window.open(correspondence.arquivo_url, '_blank');
    }
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      fiscal: { className: 'bg-red-50 text-red-800' },
      municipal: { className: 'bg-blue-50 text-blue-800' },
      estadual: { className: 'bg-green-50 text-green-800' },
      bancario: { className: 'bg-purple-50 text-purple-800' },
      trabalhista: { className: 'bg-orange-50 text-orange-800' },
      geral: { className: 'bg-gray-50 text-gray-800' },
    };
    
    const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.geral;
    return <Badge className={config.className}>{category}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes da Correspondência</span>
            <div className="flex gap-2">
              {correspondence.visualizada ? (
                <Badge className="bg-green-100 text-green-800">Visualizada</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">Nova</Badge>
              )}
              {getCategoryBadge(correspondence.categoria)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Assunto</h4>
                <p className="text-gray-900">{correspondence.assunto}</p>
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
                    <h4 className="font-medium text-gray-700">Data</h4>
                    <p className="text-gray-900">
                      {new Date(correspondence.data_recebimento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700">Nome</h4>
                  <p className="text-gray-900">{correspondence.cliente_nome}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div>
                    <h4 className="font-medium text-gray-700">Email</h4>
                    <p className="text-gray-900">{correspondence.cliente_email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conteúdo */}
          {correspondence.descricao && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900 whitespace-pre-wrap">{correspondence.descricao}</p>
              </CardContent>
            </Card>
          )}

          {/* Anexo */}
          {correspondence.arquivo_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Anexo</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDownload} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Baixar Arquivo
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleToggleStatus}
              className="flex items-center gap-2"
            >
              {correspondence.visualizada ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Marcar como Não Lida
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Marcar como Lida
                </>
              )}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CorrespondenceDetailModal;
