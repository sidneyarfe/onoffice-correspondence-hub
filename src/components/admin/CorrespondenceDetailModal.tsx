
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminCorrespondence } from '@/hooks/useAdminCorrespondences';
import { Bell, Calendar, User, Mail, Tag, Eye, EyeOff, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificarCliente } from '@/utils/notificacao';
import { registrarAtividade } from '@/utils/atividade';

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
  const { toast } = useToast();
  const [reenviando, setReenviando] = useState(false);

  if (!correspondence) return null;

  const handleReenviar = async () => {
    setReenviando(true);
    try {
      await notificarCliente(
        correspondence.user_id,
        'Nova correspondência — ON Office',
        `Você recebeu uma correspondência: ${correspondence.assunto} (de ${correspondence.remetente}).`,
        { interna: true, email: true },
      );
      await registrarAtividade(
        correspondence.user_id,
        'correspondencia_notificada',
        `Notificação reenviada da correspondência "${correspondence.assunto}" (admin)`,
      );
      toast({ title: 'Notificação reenviada', description: 'O cliente foi notificado novamente.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao reenviar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setReenviando(false);
    }
  };

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
      fiscal: { className: 'bg-red-500/10 text-red-300' },
      municipal: { className: 'bg-blue-500/10 text-blue-300' },
      estadual: { className: 'bg-on-lime/10 text-on-lime' },
      bancario: { className: 'bg-purple-500/10 text-purple-300' },
      trabalhista: { className: 'bg-orange-400/10 text-orange-300' },
      geral: { className: 'bg-white/[0.04] text-foreground' },
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
                <Badge className="bg-on-lime/15 text-on-lime">Visualizada</Badge>
              ) : (
                <Badge className="bg-amber-400/15 text-amber-300">Nova</Badge>
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
                <h4 className="font-medium text-foreground/80 mb-1">Assunto</h4>
                <p className="text-foreground">{correspondence.assunto}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-foreground/80">Remetente</h4>
                    <p className="text-foreground">{correspondence.remetente}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-foreground/80">Data</h4>
                    <p className="text-foreground">
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
                  <h4 className="font-medium text-foreground/80">Nome</h4>
                  <p className="text-foreground">{correspondence.cliente_nome}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-foreground/80">Email</h4>
                    <p className="text-foreground">{correspondence.cliente_email}</p>
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
                <p className="text-foreground whitespace-pre-wrap">{correspondence.descricao}</p>
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
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t">
            <div className="flex flex-wrap gap-2">
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
                variant="outline"
                onClick={handleReenviar}
                disabled={reenviando}
                className="flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                {reenviando ? 'Enviando…' : 'Reenviar notificação'}
              </Button>
            </div>

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
