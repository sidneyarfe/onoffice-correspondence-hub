import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AdminCorrespondence } from '@/hooks/useAdminCorrespondences';
import { useCorrespondenceCategories } from '@/hooks/useCorrespondenceCategories';
import { Bell, Calendar, User, Mail, Tag, Eye, EyeOff, Download, Trash2, Pencil, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificarCliente } from '@/utils/notificacao';
import { registrarAtividade } from '@/utils/atividade';

interface CorrespondenceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  correspondence: AdminCorrespondence | null;
  onUpdateStatus: (id: string, visualizada: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** Quando informado, exibe o botão "Editar" que devolve a correspondência ao chamador. */
  onEdit?: (correspondence: AdminCorrespondence) => void;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
    {children}
  </div>
);

const Field: React.FC<{ label: string; value?: React.ReactNode; icon?: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="min-w-0">
    <div className="mb-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground/80">
      {icon}
      {label}
    </div>
    <div className="truncate text-[13.5px] text-foreground">{value || '—'}</div>
  </div>
);

const CorrespondenceDetailModal: React.FC<CorrespondenceDetailModalProps> = ({
  isOpen,
  onClose,
  correspondence,
  onUpdateStatus,
  onDelete,
  onEdit,
}) => {
  const { toast } = useToast();
  const { categories } = useCorrespondenceCategories();
  const [reenviando, setReenviando] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);

  if (!correspondence) return null;

  const cor = categories.find((c) => c.nome === correspondence.categoria)?.cor || '#6b7280';

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
    try {
      await onDelete(correspondence.id);
      onClose();
    } catch (error) {
      console.error('Erro ao excluir correspondência:', error);
    }
  };

  const handleDownload = () => {
    if (correspondence.arquivo_url) window.open(correspondence.arquivo_url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0b0b0d]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2.5 pr-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
              <Mail className="h-4 w-4" />
            </span>
            <span className="text-[16px] font-bold">Correspondência</span>
            <span
              className={`on-pill text-[11px] ${
                correspondence.visualizada
                  ? 'bg-white/[0.06] text-muted-foreground'
                  : 'bg-blue-500/15 text-blue-300'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${correspondence.visualizada ? 'bg-muted-foreground' : 'bg-blue-400'}`} />
              {correspondence.visualizada ? 'Visualizada' : 'Nova'}
            </span>
            <span className="on-pill bg-white/[0.06] text-[11px] text-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cor }} />
              {correspondence.categoria}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5">
          {/* Assunto + metadados */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0e0e11] p-4">
            <SectionTitle>Assunto</SectionTitle>
            <p className="text-[15px] font-semibold leading-snug text-foreground">
              {correspondence.assunto}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Remetente" value={correspondence.remetente} icon={<Tag className="h-3.5 w-3.5" />} />
              <Field
                label="Recebida em"
                value={new Date(correspondence.data_recebimento).toLocaleDateString('pt-BR')}
                icon={<Calendar className="h-3.5 w-3.5" />}
              />
            </div>
          </div>

          {/* Cliente */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0e0e11] p-4">
            <SectionTitle>Cliente</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome" value={correspondence.cliente_nome} icon={<User className="h-3.5 w-3.5" />} />
              <Field label="E-mail" value={correspondence.cliente_email} icon={<Mail className="h-3.5 w-3.5" />} />
            </div>
          </div>

          {/* Descrição */}
          {correspondence.descricao && (
            <div className="rounded-xl border border-white/[0.06] bg-[#0e0e11] p-4">
              <SectionTitle>Descrição</SectionTitle>
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground/90">
                {correspondence.descricao}
              </p>
            </div>
          )}

          {/* Anexo */}
          {correspondence.arquivo_url && (
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0e0e11] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
                  <Paperclip className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13.5px] font-medium text-foreground">Arquivo anexado</p>
                  <p className="text-[11.5px] text-muted-foreground">Abrir em nova guia</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" /> Baixar
              </Button>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <Button onClick={() => onEdit(correspondence)} className="on-button gap-2">
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              )}
              <Button variant="outline" onClick={handleToggleStatus} className="gap-2">
                {correspondence.visualizada ? (
                  <>
                    <EyeOff className="h-4 w-4" /> Marcar como não lida
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" /> Marcar como lida
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReenviar} disabled={reenviando} className="gap-2">
                <Bell className="h-4 w-4" />
                {reenviando ? 'Enviando…' : 'Reenviar notificação'}
              </Button>
            </div>

            {confirmarExcluir ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">Confirmar?</span>
                <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmarExcluir(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setConfirmarExcluir(true)}
                className="gap-2 text-red-300 hover:bg-red-500/10 hover:text-red-200"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CorrespondenceDetailModal;
