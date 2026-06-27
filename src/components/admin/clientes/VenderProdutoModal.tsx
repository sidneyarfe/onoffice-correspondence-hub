import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, Package, Repeat, ShoppingCart, X } from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calcularProximoVencimento, paraDataISO } from '@/utils/vencimento';
import { brl } from './clientesShared';

interface VenderProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: AdminClient | null;
  onDone: () => void;
}

const VenderProdutoModal: React.FC<VenderProdutoModalProps> = ({ isOpen, onClose, client, onDone }) => {
  const { toast } = useToast();
  const { produtos, planos } = useProducts();
  const [planoId, setPlanoId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPlanoId('');
      setQuantidade(1);
    }
  }, [isOpen]);

  const opcoes = useMemo(() => {
    return planos
      .filter((p) => p.ativo)
      .map((p) => {
        const prod = produtos.find((x) => x.id === p.produto_id);
        return {
          id: p.id,
          produtoId: p.produto_id,
          tipo: prod?.tipo === 'avulso' ? ('avulso' as const) : ('assinatura' as const),
          produtoNome: prod?.nome_produto ?? '',
          nome: p.nome_plano,
          periodicidade: p.periodicidade,
          unidade: p.unidade,
          precoCentavos: p.preco_em_centavos,
        };
      });
  }, [planos, produtos]);

  const selecionado = opcoes.find((o) => o.id === planoId) || null;
  const isAvulso = selecionado?.tipo === 'avulso';
  const total = selecionado ? selecionado.precoCentavos * (isAvulso ? quantidade : 1) : 0;

  if (!client) return null;

  const handleConfirm = async () => {
    if (!selecionado) return;
    setSaving(true);
    try {
      if (isAvulso) {
        const { data: pedido, error: pedErr } = await supabase
          .from('pedidos')
          .insert({ cliente_id: client.id, status: 'aberto' } as never)
          .select('id')
          .single();
        if (pedErr) throw pedErr;
        const { error: itemErr } = await supabase.from('pedido_itens').insert({
          pedido_id: (pedido as { id: string }).id,
          produto_id: selecionado.produtoId,
          plano_id: selecionado.id,
          descricao: `${selecionado.produtoNome} — ${selecionado.nome}`,
          quantidade,
          unidade: selecionado.unidade,
          preco_unit_centavos: selecionado.precoCentavos,
        } as never);
        if (itemErr) throw itemErr;
        toast({ title: 'Avulso adicionado', description: `${selecionado.nome} (${quantidade} ${selecionado.unidade || 'un'}).` });
      } else {
        const hoje = new Date();
        const { error } = await supabase.from('assinaturas').insert({
          cliente_id: client.id,
          plano_id: selecionado.id,
          produto_id: selecionado.produtoId,
          status: 'ativo',
          data_contratacao: paraDataISO(hoje),
          data_inicio: paraDataISO(hoje),
          proximo_vencimento: paraDataISO(calcularProximoVencimento(hoje, selecionado.periodicidade)),
          preco_snapshot_centavos: selecionado.precoCentavos,
        } as never);
        if (error) throw error;
        toast({ title: 'Assinatura criada', description: `${selecionado.nome} ativada para ${client.name}.` });
      }
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao vender', description: 'Não foi possível registrar o produto.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[560px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold">Vender / contratar produto</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{client.name}</p>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
            Escolha o produto
          </div>
          <div className="flex flex-col gap-2">
            {opcoes.length === 0 && (
              <div className="py-6 text-center text-[13px] text-muted-foreground/60">Nenhum plano ativo no catálogo.</div>
            )}
            {opcoes.map((o) => {
              const active = o.id === planoId;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setPlanoId(o.id)}
                  className={`flex items-center gap-3 rounded-[11px] border px-3.5 py-3 text-left transition-colors ${
                    active ? 'border-on-lime/40 bg-on-lime/[0.06]' : 'border-white/[0.08] bg-[#0e0e11] hover:border-white/20'
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${o.tipo === 'avulso' ? 'bg-indigo-400/15 text-indigo-300' : 'bg-on-lime/10 text-on-lime'}`}>
                    {o.tipo === 'avulso' ? <ShoppingCart className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-semibold">{o.produtoNome} — {o.nome}</span>
                      <span className={`on-pill text-[9.5px] ${o.tipo === 'avulso' ? 'bg-indigo-400/15 text-indigo-300' : 'bg-on-lime/15 text-on-lime'}`}>
                        {o.tipo === 'avulso' ? 'Avulso' : 'Assinatura'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground/80">
                      {o.tipo === 'avulso' ? `por ${o.unidade || 'unidade'}` : o.periodicidade || 'recorrente'}
                    </div>
                  </div>
                  <div className="on-num text-[13.5px] font-semibold text-muted-foreground">{brl(o.precoCentavos / 100)}</div>
                </button>
              );
            })}
          </div>

          {isAvulso && (
            <div className="mt-4">
              <label htmlFor="vp-qtd" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">
                Quantidade ({selecionado?.unidade || 'unidade'})
              </label>
              <input
                id="vp-qtd"
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                className="on-num h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
          <div>
            <div className="text-[11.5px] text-muted-foreground/80">Total</div>
            <div className="on-num text-xl font-bold text-on-lime">{brl(total / 100)}</div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selecionado || saving}
              className="inline-flex items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:opacity-60"
            >
              <Check className="h-4 w-4" /> {saving ? 'Salvando…' : isAvulso ? 'Adicionar avulso' : 'Criar assinatura'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VenderProdutoModal;
