import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, Info, RefreshCw, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { brl } from './clientesShared';
import type { AssinaturaItem } from '@/hooks/useClienteComercio';

export type CobrarModo = 'cobrar' | 'renovar' | 'renovar_antecipado';

interface CobrarAssinaturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  userId?: string | null;
  assinatura: AssinaturaItem | null;
  modo: CobrarModo;
  onDone: () => void;
}

type Metodo = 'Pix' | 'Boleto' | 'Cartão';

const isoInDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const TITULO: Record<CobrarModo, string> = {
  cobrar: 'Gerar cobrança',
  renovar: 'Renovar assinatura',
  renovar_antecipado: 'Renovar antecipadamente',
};

const CobrarAssinaturaModal: React.FC<CobrarAssinaturaModalProps> = ({
  isOpen,
  onClose,
  clienteId,
  userId,
  assinatura,
  modo,
  onDone,
}) => {
  const { toast } = useToast();
  const [metodo, setMetodo] = useState<Metodo>('Pix');
  const [due, setDue] = useState(isoInDays(7));
  const [valor, setValor] = useState('0');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && assinatura) {
      setMetodo('Pix');
      setDue(isoInDays(7));
      setValor((assinatura.precoCentavos / 100).toFixed(2));
    }
  }, [isOpen, assinatura]);

  if (!assinatura) return null;

  const renovacao = modo !== 'cobrar';
  const valorCentavos = Math.round((parseFloat(valor.replace(',', '.')) || 0) * 100);

  const handleSend = async () => {
    if (!userId) {
      toast({
        title: 'Cliente sem acesso provisionado',
        description: 'Só é possível registrar fatura após o cliente ter usuário criado.',
        variant: 'destructive',
      });
      return;
    }
    setSending(true);
    try {
      const descricao = `${renovacao ? 'Renovação' : 'Cobrança'}: ${assinatura.produtoNome} — ${assinatura.planoNome}`;
      const { error } = await supabase.from('pagamentos').insert({
        contratacao_id: clienteId,
        cliente_plano_id: assinatura.id,
        user_id: userId,
        valor: valorCentavos / 100,
        valor_centavos: valorCentavos,
        data_vencimento: due,
        descricao,
        status: 'pendente',
      } as never);
      if (error) throw error;
      toast({
        title: renovacao ? 'Renovação gerada' : 'Cobrança gerada',
        description: `Fatura de ${brl(valorCentavos / 100)} registrada para esta assinatura.`,
      });
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao gerar cobrança', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-5">
          <div className="flex items-center gap-2">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${renovacao ? 'bg-blue-400/15 text-blue-300' : 'bg-on-lime/10 text-on-lime'}`}>
              {renovacao ? <RefreshCw className="h-[18px] w-[18px]" /> : <Send className="h-[18px] w-[18px]" />}
            </span>
            <div>
              <h2 className="text-lg font-bold">{TITULO[modo]}</h2>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">{assinatura.produtoNome} — {assinatura.planoNome}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {modo === 'renovar_antecipado' && (
            <div className="mb-4 flex gap-2.5 rounded-[11px] border border-blue-400/25 bg-blue-400/[0.06] px-3.5 py-3 text-[12.5px] leading-relaxed text-blue-200">
              <Info className="mt-0.5 h-[17px] w-[17px] shrink-0" />
              <span>O ciclo atual já está pago — esta é uma renovação antecipada do <b>próximo</b> ciclo.</span>
            </div>
          )}
          <div className="mb-4 flex gap-2.5 rounded-[11px] border border-amber-400/25 bg-amber-400/5 px-3.5 py-3 text-xs leading-relaxed text-amber-200/90">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>A fatura é registrada como pendente. O link de pagamento (InfinitePay) é integração futura.</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="ca-valor" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Valor (R$)</label>
              <input
                id="ca-valor"
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="on-num h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Forma de pagamento</label>
              <div className="flex gap-0.5 rounded-[9px] border border-white/10 bg-[#0e0e11] p-[3px]">
                {(['Pix', 'Boleto', 'Cartão'] as Metodo[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetodo(m)}
                    className={`flex-1 rounded-md px-2 py-2 text-[12.5px] font-medium transition-colors ${metodo === m ? 'bg-on-lime font-semibold text-on-black' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="ca-due" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Vencimento</label>
              <input
                id="ca-due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="on-num h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
          <div>
            <div className="text-[11.5px] text-muted-foreground/80">Total</div>
            <div className="on-num text-xl font-bold text-on-lime">{brl(valorCentavos / 100)}</div>
          </div>
          <div className="flex gap-2.5">
            <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25">
              <X className="h-4 w-4" /> Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={sending || valorCentavos <= 0}
              className="inline-flex items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:opacity-60"
            >
              <Check className="h-4 w-4" /> {sending ? 'Gerando…' : renovacao ? 'Renovar' : 'Gerar cobrança'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CobrarAssinaturaModal;
