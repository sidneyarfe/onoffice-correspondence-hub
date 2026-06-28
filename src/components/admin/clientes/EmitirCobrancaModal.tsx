import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Bell, Check, Info, Mail, RefreshCw, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calcularProximoVencimento, paraDataISO } from '@/utils/vencimento';
import { registrarAtividade } from '@/utils/atividade';
import { notificarCliente } from '@/utils/notificacao';
import { codigoFatura } from './clienteStatus';
import { brl } from './clientesShared';

export interface CobrancaAlvo {
  titulo: string;
  /** descrição base da fatura */
  descricao: string;
  valorCentavos: number;
  /** nome do produto — usado para gerar o código da fatura */
  produtoNome?: string | null;
  /** vincula a fatura à assinatura (pagamentos.cliente_plano_id) */
  assinaturaId?: string | null;
  /** renovação antecipada: estende o vencimento da assinatura em +1 período após o vencimento atual */
  renovacao?: { assinaturaId: string; proximoVencimento: string | null; periodicidade: string | null };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  userId?: string | null;
  alvo: CobrancaAlvo | null;
  onDone: () => void;
}

const isoInDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('pt-BR');
};

const EmitirCobrancaModal: React.FC<Props> = ({ isOpen, onClose, clienteId, userId, alvo, onDone }) => {
  const { toast } = useToast();
  const [valor, setValor] = useState('0');
  const [due, setDue] = useState(isoInDays(7));
  const [notifInterna, setNotifInterna] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [sending, setSending] = useState(false);

  const renovacao = alvo?.renovacao;

  useEffect(() => {
    if (isOpen && alvo) {
      setValor((alvo.valorCentavos / 100).toFixed(2));
      setDue(renovacao?.proximoVencimento ? new Date(renovacao.proximoVencimento).toISOString().slice(0, 10) : isoInDays(7));
      setNotifInterna(true);
      setNotifEmail(false);
      setSending(false);
    }
  }, [isOpen, alvo, renovacao]);

  const valorCentavos = useMemo(() => Math.round((parseFloat(valor.replace(',', '.')) || 0) * 100), [valor]);

  const novoVencimento = useMemo(() => {
    if (!renovacao) return null;
    const base = renovacao.proximoVencimento ? new Date(renovacao.proximoVencimento) : new Date();
    return paraDataISO(calcularProximoVencimento(base, renovacao.periodicidade));
  }, [renovacao]);

  if (!alvo) return null;

  const handleSend = async () => {
    if (!userId) {
      toast({ title: 'Cliente sem acesso', description: 'Só é possível cobrar após o cliente ter usuário criado.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data: nova, error } = await supabase
        .from('pagamentos')
        .insert({
          contratacao_id: clienteId,
          cliente_plano_id: alvo.assinaturaId ?? renovacao?.assinaturaId ?? null,
          user_id: userId,
          valor: valorCentavos / 100,
          valor_centavos: valorCentavos,
          data_vencimento: due,
          descricao: alvo.descricao,
          status: 'pendente',
        } as never)
        .select('id, created_at')
        .single();
      if (error) throw error;
      const novaRow = nova as { id: string; created_at: string | null };
      const codigo = codigoFatura(novaRow.id, alvo.produtoNome, novaRow.created_at);

      if (renovacao && novoVencimento) {
        const { error: assErr } = await supabase
          .from('assinaturas')
          .update({ proximo_vencimento: novoVencimento, updated_at: new Date().toISOString() } as never)
          .eq('id', renovacao.assinaturaId);
        if (assErr) throw assErr;
      }

      await notificarCliente(
        userId,
        `Cobrança ${codigo} — ON Office`,
        `${alvo.titulo}: ${brl(valorCentavos / 100)}. Vencimento em ${fmtDate(due)}.`,
        { interna: notifInterna, email: notifEmail },
      );
      registrarAtividade(userId, 'cobranca_emitida', `${alvo.titulo} ${codigo}: ${brl(valorCentavos / 100)} — ${alvo.descricao} (admin)`);
      if (notifInterna || notifEmail) {
        const canais = [notifInterna ? 'plataforma' : null, notifEmail ? 'e-mail' : null].filter(Boolean).join(' + ');
        registrarAtividade(userId, 'fatura_notificada', `Notificação da fatura ${codigo} enviada via ${canais} (admin)`);
      }

      toast({ title: 'Cobrança emitida', description: `Fatura de ${brl(valorCentavos / 100)} registrada.` });
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao emitir cobrança', description: err instanceof Error ? err.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    'on-num h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50';

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-6 py-5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${renovacao ? 'bg-blue-400/15 text-blue-300' : 'bg-on-lime/10 text-on-lime'}`}>
            {renovacao ? <RefreshCw className="h-[18px] w-[18px]" /> : <Send className="h-[18px] w-[18px]" />}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{alvo.titulo}</h2>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{alvo.descricao}</p>
          </div>
        </div>

        <div className="px-6 py-5">
          {renovacao && novoVencimento && (
            <div className="mb-4 flex gap-2.5 rounded-[11px] border border-blue-400/25 bg-blue-400/[0.06] px-3.5 py-3 text-[12.5px] leading-relaxed text-blue-200">
              <Info className="mt-0.5 h-[17px] w-[17px] shrink-0" />
              <span>
                A renovação antecipada alonga a assinatura por mais um período: o vencimento passa de{' '}
                <b>{fmtDate(renovacao.proximoVencimento)}</b> para <b>{fmtDate(novoVencimento)}</b>.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="cb-valor" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Valor (R$)</label>
              <input id="cb-valor" type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cb-due" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Vencimento da fatura</label>
              <input id="cb-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Notificar o cliente</div>
            <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px]">
              <input type="checkbox" checked={notifInterna} onChange={(e) => setNotifInterna(e.target.checked)} className="h-4 w-4 accent-on-lime" />
              <Bell className="h-4 w-4 text-muted-foreground" /> Notificação na plataforma
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px]">
              <input type="checkbox" checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} className="h-4 w-4 accent-on-lime" />
              <Mail className="h-4 w-4 text-muted-foreground" /> Enviar por e-mail
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
          <div>
            <div className="text-[11.5px] text-muted-foreground/80">Total</div>
            <div className="on-num text-xl font-bold text-on-lime">{brl(valorCentavos / 100)}</div>
          </div>
          <div className="flex gap-2.5">
            <button type="button" onClick={onClose} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25">
              <X className="h-4 w-4" /> Cancelar
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || valorCentavos <= 0}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> {sending ? 'Emitindo…' : renovacao ? 'Renovar' : 'Emitir cobrança'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmitirCobrancaModal;
