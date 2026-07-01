import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, Ban, Check, Trash2, X } from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import { useToast } from '@/hooks/use-toast';
import { StatusPill } from './clientesShared';

interface ExcluirClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: AdminClient | null;
  /** marca o cliente como Cancelado (reversível) — preserva o histórico */
  onCancelarContratacao: (c: AdminClient) => Promise<void>;
  /** remove o registro definitivamente (irreversível) */
  onExcluirDefinitivo: (c: AdminClient) => Promise<void>;
}

const CONFIRM_WORD = 'EXCLUIR';

const ExcluirClienteModal: React.FC<ExcluirClienteModalProps> = ({
  isOpen,
  onClose,
  client,
  onCancelarContratacao,
  onExcluirDefinitivo,
}) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<'menu' | 'confirmDelete'>('menu');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode('menu');
      setConfirmText('');
      setBusy(false);
    }
  }, [isOpen]);

  if (!client) return null;

  const jaCancelado = client.status === 'cancelado';
  const canConfirmDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const handleCancelar = async () => {
    setBusy(true);
    try {
      await onCancelarContratacao(client);
      toast({ title: 'Contratação cancelada', description: `${client.name} foi marcado como cancelado.` });
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao cancelar', description: 'Não foi possível cancelar a contratação.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleExcluir = async () => {
    if (!canConfirmDelete) return;
    setBusy(true);
    try {
      await onExcluirDefinitivo(client);
      toast({ title: 'Cliente excluído', description: `${client.name} foi removido definitivamente.` });
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao excluir', description: 'Não foi possível excluir o cliente.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[500px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Encerrar cliente</h2>
            <StatusPill status={client.status} short />
          </div>
        </div>

        {mode === 'menu' ? (
          <div className="flex flex-col gap-3 px-6 py-5">
            <p className="text-[12.5px] text-muted-foreground">
              Escolha como deseja encerrar <b className="text-foreground">{client.name}</b>.
            </p>

            {!jaCancelado && (
              <button
                onClick={handleCancelar}
                disabled={busy}
                className="flex items-start gap-3 rounded-[12px] border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3.5 text-left transition-colors hover:border-amber-400/45 disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
                  <Ban className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-amber-100">Cancelar contratação</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                    Marca o cliente como <b className="text-amber-200">Cancelado</b> e preserva todo o histórico. Pode
                    ser reativado depois pelo funil.
                  </span>
                </span>
              </button>
            )}

            <button
              onClick={() => setMode('confirmDelete')}
              disabled={busy}
              className="flex items-start gap-3 rounded-[12px] border border-red-500/25 bg-red-500/[0.05] px-4 py-3.5 text-left transition-colors hover:border-red-500/45 disabled:opacity-60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-300">
                <Trash2 className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-red-200">Excluir definitivamente</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                  Remove o registro do cliente e seus dados de contratação. Esta ação{' '}
                  <b className="text-red-300">não pode ser desfeita</b>.
                </span>
              </span>
            </button>

            <div className="mt-1 flex justify-end">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
              >
                <X className="h-4 w-4" /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5">
            <div className="mb-4 flex gap-2.5 rounded-[11px] border border-red-500/25 bg-red-500/[0.06] px-3.5 py-3 text-[12.5px] leading-relaxed text-red-200">
              <AlertTriangle className="mt-0.5 h-[17px] w-[17px] shrink-0" />
              Você está prestes a excluir <b>{client.name}</b> permanentemente. Para confirmar, digite{' '}
              <b className="text-red-300">{CONFIRM_WORD}</b> abaixo.
            </div>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExcluir()}
              placeholder={CONFIRM_WORD}
              className="h-11 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-sm tracking-[0.12em] outline-none transition-colors focus:border-red-500/60"
            />

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setMode('menu')}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25 disabled:opacity-60"
              >
                Voltar
              </button>
              <button
                onClick={handleExcluir}
                disabled={!canConfirmDelete || busy}
                className="inline-flex items-center gap-2 rounded-[10px] bg-red-500 px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> {busy ? 'Excluindo…' : 'Excluir cliente'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExcluirClienteModal;
