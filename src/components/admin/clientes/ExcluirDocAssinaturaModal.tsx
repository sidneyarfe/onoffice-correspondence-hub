import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, Check, Lock, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { reauthAdmin } from '@/utils/reauth';
import { registrarAtividade } from '@/utils/atividade';
import type { AssinaturaItem } from '@/hooks/useClienteComercio';

const DOC_BUCKET = 'documentos_fiscais';

export interface DocAlvo {
  id: string;
  nome: string;
  tipo: string;
  arquivoUrl: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  doc: DocAlvo | null;
  assinatura: AssinaturaItem | null;
  userId?: string | null;
  onDone: () => void;
}

/**
 * Exclui um documento fixado na assinatura (contrato assinado / comprovante) e, quando for o caso,
 * "volta casas" no status para corrigir. Ação sensível: exige a senha do admin (reauth).
 *   - Contrato assinado  → status volta para aguardando_assinatura (+ limpa zapsign_signed_at)
 *   - Comprovante (se a assinatura está ativa) → volta para aguardando_pagamento
 */
const ExcluirDocAssinaturaModal: React.FC<Props> = ({ isOpen, onClose, doc, assinatura, userId, onDone }) => {
  const { toast } = useToast();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSenha('');
      setErro(null);
      setBusy(false);
    }
  }, [isOpen]);

  if (!doc) return null;

  const ehContrato = doc.tipo === 'Contrato assinado';
  const ehComprovante = doc.tipo === 'Comprovante de pagamento';
  const reverteStatus = ehContrato || (ehComprovante && assinatura?.status === 'ativo');
  const novoStatus = ehContrato ? 'aguardando_assinatura' : 'aguardando_pagamento';

  const handleConfirm = async () => {
    setBusy(true);
    setErro(null);
    try {
      await reauthAdmin(senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Senha inválida.');
      setBusy(false);
      return;
    }
    try {
      // remove o arquivo do storage (best-effort)
      if (doc.arquivoUrl) {
        const marker = `/${DOC_BUCKET}/`;
        const idx = doc.arquivoUrl.indexOf(marker);
        if (idx >= 0) {
          const path = decodeURIComponent(doc.arquivoUrl.slice(idx + marker.length).split('?')[0]);
          try {
            await supabase.storage.from(DOC_BUCKET).remove([path]);
          } catch (e) {
            console.warn('Falha ao remover arquivo do storage:', e);
          }
        }
      }

      const { error: delErr } = await supabase.from('documentos_cliente').delete().eq('id', doc.id);
      if (delErr) throw delErr;

      if (reverteStatus && assinatura) {
        const patch: Record<string, unknown> = { status: novoStatus, updated_at: new Date().toISOString() };
        if (ehContrato) patch.zapsign_signed_at = null;
        const { error: assErr } = await supabase.from('assinaturas').update(patch as never).eq('id', assinatura.id);
        if (assErr) throw assErr;
      }

      await registrarAtividade(
        userId,
        'documento_excluido',
        `Documento "${doc.nome}" excluído${reverteStatus ? ` — status revertido para ${novoStatus.replace('_', ' ')}` : ''} (admin)`,
      );
      toast({ title: 'Documento excluído', description: reverteStatus ? 'O status da assinatura foi revertido.' : 'O documento foi removido.' });
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao excluir', description: err instanceof Error ? err.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[460px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-6 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-300">
            <Trash2 className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Excluir documento</h2>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{doc.nome}</p>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex gap-2.5 rounded-[11px] border border-red-500/25 bg-red-500/[0.06] px-3.5 py-3 text-[12.5px] leading-relaxed text-red-200">
            <AlertTriangle className="mt-0.5 h-[17px] w-[17px] shrink-0" />
            <span>
              Esta ação remove o documento{reverteStatus ? <> e <b>reverte o status</b> da assinatura para <b>{novoStatus.replace('_', ' ')}</b></> : null}. Não pode ser desfeita.
            </span>
          </div>

          <label htmlFor="ex-senha" className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Confirme com a sua senha de admin
          </label>
          <input
            id="ex-senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              setErro(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && senha.trim() && handleConfirm()}
            placeholder="Sua senha"
            className={`h-10 w-full rounded-[9px] border bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors ${
              erro ? 'border-red-500/60' : 'border-white/10 focus:border-on-lime/50'
            }`}
          />
          {erro && <p className="mt-1.5 text-[11.5px] text-red-300">{erro}</p>}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] px-6 py-4">
          <button type="button" onClick={onClose} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25">
            <X className="h-4 w-4" /> Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || senha.trim().length === 0}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-red-500 px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" /> {busy ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExcluirDocAssinaturaModal;
