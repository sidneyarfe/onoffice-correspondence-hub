import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, Repeat, Search, ShoppingCart, X } from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calcularProximoVencimento, paraDataISO } from '@/utils/vencimento';
import { AVULSO_UNIDADES, precoModalidadeCentavos, labelUnidade } from '@/utils/avulso';
import { registrarAtividade } from '@/utils/atividade';
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
  const [modalidade, setModalidade] = useState<string>('hora');
  const [saving, setSaving] = useState(false);
  const [aba, setAba] = useState<'assinatura' | 'avulso'>('assinatura');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPlanoId('');
      setQuantidade(1);
      setModalidade('hora');
      setAba('assinatura');
      setBusca('');
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
          exigeContrato: prod?.exige_contrato ?? false,
          nome: p.nome_plano,
          periodicidade: p.periodicidade,
          unidade: p.unidade,
          precoCentavos: p.preco_em_centavos,
        };
      });
  }, [planos, produtos]);

  const countAss = useMemo(() => opcoes.filter((o) => o.tipo === 'assinatura').length, [opcoes]);
  const countAvu = useMemo(() => opcoes.filter((o) => o.tipo === 'avulso').length, [opcoes]);
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return opcoes.filter(
      (o) => o.tipo === aba && (!q || o.produtoNome.toLowerCase().includes(q) || o.nome.toLowerCase().includes(q)),
    );
  }, [opcoes, aba, busca]);

  const trocarAba = (nova: 'assinatura' | 'avulso') => {
    setAba(nova);
    setPlanoId('');
  };

  const selecionado = opcoes.find((o) => o.id === planoId) || null;
  const isAvulso = selecionado?.tipo === 'avulso';
  // Avulso: preço é por HORA base; a modalidade define quantas horas. Total = preço/hora × horas × qtd.
  const precoUnitAvulso = selecionado && isAvulso ? precoModalidadeCentavos(selecionado.precoCentavos, modalidade) : 0;
  const total = selecionado ? (isAvulso ? precoUnitAvulso * quantidade : selecionado.precoCentavos) : 0;

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
          descricao: `${selecionado.produtoNome} — ${selecionado.nome} (${labelUnidade(modalidade)})`,
          quantidade,
          unidade: modalidade,
          preco_unit_centavos: precoUnitAvulso,
        } as never);
        if (itemErr) throw itemErr;
        toast({ title: 'Avulso adicionado', description: `${selecionado.nome}: ${quantidade}× ${labelUnidade(modalidade)}.` });
      } else {
        const hoje = new Date();
        const { error } = await supabase.from('assinaturas').insert({
          cliente_id: client.id,
          plano_id: selecionado.id,
          produto_id: selecionado.produtoId,
          // Assinatura nova SEMPRE começa do início do processo: contrato → pagamento → vigente.
          // Nunca nasce "ativa/paga"; avança só com contrato registrado e a fatura paga.
          status: 'aguardando_assinatura',
          data_contratacao: paraDataISO(hoje),
          data_inicio: paraDataISO(hoje),
          proximo_vencimento: paraDataISO(calcularProximoVencimento(hoje, selecionado.periodicidade)),
          preco_snapshot_centavos: selecionado.precoCentavos,
        } as never);
        if (error) throw error;
        toast({ title: 'Assinatura criada', description: `${selecionado.nome} ativada para ${client.name}.` });
      }
      registrarAtividade(
        client.user_id,
        isAvulso ? 'avulso_adicionado' : 'assinatura_criada',
        `${isAvulso ? 'Avulso adicionado' : 'Assinatura criada'} pelo admin: ${selecionado.produtoNome} — ${selecionado.nome}`,
      );
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
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
              Escolha o produto
            </div>
            <div className="flex gap-0.5 rounded-[9px] border border-white/10 bg-[#0e0e11] p-[3px]">
              <button
                type="button"
                onClick={() => trocarAba('assinatura')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] transition-colors ${
                  aba === 'assinatura' ? 'bg-on-lime font-semibold text-on-black' : 'font-medium text-muted-foreground hover:text-foreground'
                }`}
              >
                <Repeat className="h-3.5 w-3.5" /> Assinaturas ({countAss})
              </button>
              <button
                type="button"
                onClick={() => trocarAba('avulso')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] transition-colors ${
                  aba === 'avulso' ? 'bg-on-lime font-semibold text-on-black' : 'font-medium text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Avulsos ({countAvu})
              </button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={`Buscar ${aba === 'avulso' ? 'avulso' : 'assinatura'} por produto ou oferta…`}
              className="h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] pl-9 pr-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            {filtradas.length === 0 ? (
              <div className="rounded-[11px] border border-dashed border-white/[0.1] px-4 py-6 text-center text-[12.5px] text-muted-foreground/60">
                {busca.trim() ? (
                  <>
                    Nenhum resultado para "<b className="text-foreground">{busca}</b>". Tente outro termo ou troque de aba.
                  </>
                ) : aba === 'assinatura' ? (
                  'Nenhuma assinatura ativa no catálogo.'
                ) : (
                  'Nenhum avulso ativo no catálogo.'
                )}
              </div>
            ) : (
              filtradas.map((o) => {
                const active = o.id === planoId;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setPlanoId(o.id);
                      if (o.tipo === 'avulso') setModalidade(o.unidade || 'hora');
                    }}
                    className={`flex cursor-pointer items-center gap-3 rounded-[11px] border px-3.5 py-3 text-left transition-colors ${
                      active ? 'border-on-lime/40 bg-on-lime/[0.06]' : 'border-white/[0.08] bg-[#0e0e11] hover:border-white/20'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${o.tipo === 'avulso' ? 'bg-indigo-400/15 text-indigo-300' : 'bg-on-lime/10 text-on-lime'}`}>
                      {o.tipo === 'avulso' ? <ShoppingCart className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold">{o.produtoNome || 'Produto'}</span>
                        <span className={`on-pill text-[9.5px] ${o.tipo === 'avulso' ? 'bg-indigo-400/15 text-indigo-300' : 'bg-on-lime/15 text-on-lime'}`}>
                          {o.tipo === 'avulso' ? 'Avulso' : 'Assinatura'}
                        </span>
                        {o.exigeContrato && <span className="on-pill bg-indigo-400/15 text-[9.5px] text-indigo-200">Contrato</span>}
                      </div>
                      <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground/80">
                        Oferta: {o.nome} · {o.tipo === 'avulso' ? 'por hora (base)' : o.periodicidade || 'recorrente'}
                      </div>
                    </div>
                    <div className="on-num text-[13.5px] font-semibold text-muted-foreground">{brl(o.precoCentavos / 100)}</div>
                  </button>
                );
              })
            )}
          </div>

          {isAvulso && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="vp-mod" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">
                  Modalidade
                </label>
                <select
                  id="vp-mod"
                  value={modalidade}
                  onChange={(e) => setModalidade(e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50"
                >
                  {AVULSO_UNIDADES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="vp-qtd" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">
                  Quantidade
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
              <p className="col-span-2 -mt-1 text-[11px] text-muted-foreground/80">
                {quantidade}× {labelUnidade(modalidade)} · {brl(precoUnitAvulso / 100)} cada (calculado pela hora base).
              </p>
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
