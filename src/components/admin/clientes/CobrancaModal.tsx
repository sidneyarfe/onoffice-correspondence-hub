import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, Info, Send, X } from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { brl, mensalidadeReais } from './clientesShared';

interface CobrancaModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: AdminClient | null;
  /** quando vem do Kanban Pagamento→Ativo, ativa o cliente ao enviar */
  target: 'ativo' | null;
  onDone: () => void;
}

type Metodo = 'Pix' | 'Boleto' | 'Cartão';

const isoInDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const CobrancaModal: React.FC<CobrancaModalProps> = ({ isOpen, onClose, client, target, onDone }) => {
  const { toast } = useToast();
  const { produtos, planos } = useProducts();
  const [sending, setSending] = useState(false);
  const [planoChecked, setPlanoChecked] = useState(true);
  const [extras, setExtras] = useState<Record<string, boolean>>({});
  const [metodo, setMetodo] = useState<Metodo>('Pix');
  const [due, setDue] = useState(isoInDays(7));

  useEffect(() => {
    if (isOpen) {
      setPlanoChecked(true);
      setExtras({});
      setMetodo('Pix');
      setDue(isoInDays(7));
    }
  }, [isOpen]);

  const extraOptions = useMemo(() => {
    const nome = (pid: string) => produtos.find((p) => p.id === pid)?.nome_produto || '';
    return planos
      .filter((p) => p.ativo && p.id !== client?.plano_id)
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        nome: `${nome(p.produto_id)} — ${p.nome_plano}`,
        per: p.periodicidade || '—',
        reais: (p.preco_em_centavos || 0) / 100,
      }));
  }, [planos, produtos, client?.plano_id]);

  if (!client) return null;

  const planoReais = mensalidadeReais(client);
  const total =
    (planoChecked ? planoReais : 0) +
    extraOptions.filter((o) => extras[o.id]).reduce((s, o) => s + o.reais, 0);

  const toggleExtra = (id: string) => setExtras((e) => ({ ...e, [id]: !e[id] }));

  const handleSend = async () => {
    setSending(true);
    try {
      const itens: string[] = [];
      if (planoChecked) itens.push(client.plan);
      extraOptions.filter((o) => extras[o.id]).forEach((o) => itens.push(o.nome));
      const descricao = itens.length ? `Cobrança: ${itens.join(' + ')}` : 'Cobrança avulsa';

      // 1. Fatura em pagamentos (requer user_id provisionado)
      if (client.user_id) {
        const { error: payErr } = await supabase.from('pagamentos').insert({
          contratacao_id: client.id,
          user_id: client.user_id,
          valor: total,
          data_vencimento: due,
          descricao,
          status: 'pendente',
        } as never);
        if (payErr) throw payErr;
      }

      // 2. Espelha método/vencimento (e ativa, se veio do funil)
      const upd: Record<string, unknown> = {
        metodo_pagamento: metodo,
        proximo_vencimento: due,
        updated_at: new Date().toISOString(),
      };
      if (target === 'ativo') upd.status_contratacao = 'ATIVO';
      const { error: updErr } = await supabase
        .from('contratacoes_clientes')
        .update(upd as never)
        .eq('id', client.id);
      if (updErr) throw updErr;

      if (!client.user_id) {
        toast({
          title: 'Cobrança registrada (parcial)',
          description: 'Cliente sem acesso provisionado — fatura não lançada em pagamentos, mas vencimento/método salvos.',
        });
      } else {
        toast({
          title: target === 'ativo' ? 'Cobrança enviada e cliente ativado' : 'Cobrança gerada',
          description: `Fatura de ${brl(total)} registrada para ${client.email}.`,
        });
      }
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao gerar cobrança', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const checkBox = (active: boolean) =>
    `flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
      active ? 'border-on-lime bg-on-lime text-on-black' : 'border-white/15 text-transparent'
    }`;
  const rowCls = (active: boolean) =>
    `flex cursor-pointer items-center gap-3 rounded-[11px] border px-3.5 py-3 transition-colors ${
      active ? 'border-on-lime/40 bg-on-lime/[0.06]' : 'border-white/[0.08] bg-[#0e0e11] hover:border-white/20'
    }`;
  const methodBtn = (active: boolean) =>
    `flex-1 rounded-md px-2 py-2 text-[13px] font-medium transition-colors ${
      active ? 'bg-on-lime font-semibold text-on-black' : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[560px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold">Gerar cobrança</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{client.name}</p>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {target === 'ativo' && (
            <div className="mb-4 flex gap-2.5 rounded-[11px] border border-on-lime/20 bg-on-lime/5 px-3.5 py-3 text-xs leading-relaxed text-on-lime/85">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-on-lime" />
              Para ativar o cliente, conclua o envio desta cobrança.
            </div>
          )}

          {/* Aviso InfinitePay */}
          <div className="mb-4 flex gap-2.5 rounded-[11px] border border-amber-400/25 bg-amber-400/5 px-3.5 py-3 text-xs leading-relaxed text-amber-200/90">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            A fatura é registrada no sistema. A geração do link de pagamento via{' '}
            <b className="text-amber-200">InfinitePay</b> é uma integração futura — ainda não está ativa.
          </div>

          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
            Plano contratado
          </div>
          <div className={rowCls(planoChecked)} onClick={() => setPlanoChecked((v) => !v)}>
            <span className={checkBox(planoChecked)}>
              <Check className="h-3 w-3" strokeWidth={3.4} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">{client.plan}</div>
              <div className="text-[11.5px] text-muted-foreground/80">Mensalidade do plano</div>
            </div>
            <div className="on-num text-[13.5px] font-semibold text-muted-foreground">{brl(planoReais)}</div>
          </div>

          {extraOptions.length > 0 && (
            <>
              <div className="mb-2.5 mt-[18px] text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                Outros produtos ON Office
              </div>
              <div className="flex flex-col gap-2">
                {extraOptions.map((o) => {
                  const active = !!extras[o.id];
                  return (
                    <div key={o.id} className={rowCls(active)} onClick={() => toggleExtra(o.id)}>
                      <span className={checkBox(active)}>
                        <Check className="h-3 w-3" strokeWidth={3.4} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold">{o.nome}</div>
                        <div className="text-[11px] text-muted-foreground/80">{o.per}</div>
                      </div>
                      <div className="on-num text-[13px] font-semibold text-muted-foreground">{brl(o.reais)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Forma de pagamento</label>
              <div className="flex gap-0.5 rounded-[9px] border border-white/10 bg-[#0e0e11] p-[3px]">
                {(['Pix', 'Boleto', 'Cartão'] as Metodo[]).map((m) => (
                  <button key={m} onClick={() => setMetodo(m)} className={methodBtn(metodo === m)}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Vencimento</label>
              <input
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
            <div className="text-[11.5px] text-muted-foreground/80">Total da cobrança</div>
            <div className="on-num text-xl font-bold text-on-lime">{brl(total)}</div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={sending || total <= 0}
              className="inline-flex items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> {sending ? 'Enviando…' : target === 'ativo' ? 'Cobrar e ativar' : 'Gerar cobrança'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CobrancaModal;
