import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, FileSignature, Info, Send, X } from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isPJ } from './clientesShared';

interface EnviarContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: AdminClient | null;
  onDone: () => void;
}

const EnviarContratoModal: React.FC<EnviarContratoModalProps> = ({ isOpen, onClose, client, onDone }) => {
  const { toast } = useToast();
  const { produtos, planos } = useProducts();
  const [planoId, setPlanoId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) setPlanoId(client?.plano_id || '');
  }, [isOpen, client?.plano_id]);

  const planoOptions = useMemo(() => {
    const nome = (pid: string) => produtos.find((p) => p.id === pid)?.nome_produto || '';
    return planos.filter((p) => p.ativo).map((p) => ({ id: p.id, label: `${nome(p.produto_id)} — ${p.nome_plano}` }));
  }, [planos, produtos]);

  if (!client) return null;

  const planoSel = planos.find((p) => p.id === planoId) || null;
  const semTemplate =
    !!planoSel &&
    ((isPJ(client) && !planoSel.zapsign_template_id_pj) || (!isPJ(client) && !planoSel.zapsign_template_id_pf));

  const handleSend = async () => {
    if (!planoId) {
      toast({ title: 'Selecione um plano', description: 'O contrato é gerado a partir do template do plano.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('enviar-contrato', {
        body: { contratacao_id: client.id, plano_id: planoId },
      });
      if (error) throw error;
      const res = data as { error?: string; signing_url?: string };
      if (res?.error) throw new Error(res.error);
      toast({
        title: 'Contrato enviado',
        description: `Documento gerado no ZapSign e enviado para ${client.email} assinar.`,
      });
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao enviar contrato',
        description: err instanceof Error ? err.message : 'Verifique o template do plano e o token ZapSign.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[500px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-400/15 text-indigo-200">
              <FileSignature className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-lg font-bold">Enviar contrato para assinatura</h2>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">{client.name}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex gap-2.5 rounded-[11px] border border-indigo-400/28 bg-indigo-400/10 px-3.5 py-3 text-[12.5px] leading-relaxed text-indigo-200">
            <Info className="mt-0.5 h-[17px] w-[17px] shrink-0" />
            <span>
              O contrato é gerado no <b>ZapSign</b> a partir do template do plano ({isPJ(client) ? 'PJ' : 'PF'}),
              preenchido com os dados do cliente e enviado por e-mail para <b>{client.email}</b> assinar.
            </span>
          </div>

          <label htmlFor="ec-plano" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">
            Plano do contrato
          </label>
          <select
            id="ec-plano"
            value={planoId}
            onChange={(e) => setPlanoId(e.target.value)}
            className="h-10 w-full cursor-pointer appearance-none rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50"
          >
            <option value="">Selecione um plano</option>
            {planoOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          {semTemplate && (
            <div className="mt-3 flex gap-2.5 rounded-[11px] border border-amber-400/25 bg-amber-400/5 px-3.5 py-3 text-xs leading-relaxed text-amber-200/90">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>
                Este produto não tem template ZapSign para {isPJ(client) ? 'PJ' : 'PF'} configurado. Defina o{' '}
                <b>ZapSign Template {isPJ(client) ? 'PJ' : 'PF'}</b> no cadastro do produto antes de enviar.
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] px-6 py-4">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
          >
            <X className="h-4 w-4" /> Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !planoId || semTemplate}
            className="inline-flex items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {sending ? 'Enviando…' : 'Enviar contrato'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnviarContratoModal;
