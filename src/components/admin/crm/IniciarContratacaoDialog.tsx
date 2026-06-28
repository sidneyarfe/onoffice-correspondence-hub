import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Repeat, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { useCrmEtapas, useCrmMutations } from '@/hooks/useCrm';
import { crmFrom, type CrmNegocio } from '@/integrations/supabase/crm';
import { calcularProximoVencimento, paraDataISO } from '@/utils/vencimento';
import { AVULSO_UNIDADES, precoModalidadeCentavos, labelUnidade } from '@/utils/avulso';
import { brl } from '../clientes/clientesShared';

interface Props {
  negocio: CrmNegocio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Pessoa = 'fisica' | 'juridica';

interface CartItem {
  key: string;
  tipo: 'assinatura' | 'avulso';
  planoId: string;
  produtoId: string;
  produtoNome: string;
  planoNome: string;
  periodicidade: 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bianual';
  unidade: string | null;
  precoCentavos: number; // assinatura: preço do plano · avulso: preço/hora base
  quantidade: number;
  modalidade: string;
}

const inputCls =
  'h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50';
const labelCls = 'mb-1.5 block text-[11.5px] font-medium text-muted-foreground';

const itemTotal = (i: CartItem) =>
  i.tipo === 'avulso' ? precoModalidadeCentavos(i.precoCentavos, i.modalidade) * i.quantidade : i.precoCentavos;

const IniciarContratacaoDialog = ({ negocio, open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const { produtos, planos } = useProducts();
  const { data: etapas = [] } = useCrmEtapas();
  const { atualizarNegocio } = useCrmMutations();

  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({
    tipo_pessoa: 'fisica' as Pessoa,
    nome_responsavel: '',
    cpf_responsavel: '',
    razao_social: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    numero_endereco: '',
    complemento_endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [aba, setAba] = useState<'assinatura' | 'avulso'>('assinatura');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (open) {
      const c = negocio?.contato;
      setForm((f) => ({
        ...f,
        nome_responsavel: c?.nome ?? '',
        email: c?.email ?? '',
        telefone: c?.telefone ?? '',
      }));
      setCart([]);
      setAba('assinatura');
      setBusca('');
      setEnviando(false);
    }
  }, [open, negocio?.contato]);

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
          planoNome: p.nome_plano,
          periodicidade: p.periodicidade,
          unidade: p.unidade,
          precoCentavos: p.preco_em_centavos,
        };
      });
  }, [planos, produtos]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return opcoes.filter(
      (o) => o.tipo === aba && (!q || o.produtoNome.toLowerCase().includes(q) || o.planoNome.toLowerCase().includes(q)),
    );
  }, [opcoes, aba, busca]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  const adicionar = (o: (typeof opcoes)[number]) =>
    setCart((c) => [
      ...c,
      {
        key: `${o.id}-${Date.now()}`,
        tipo: o.tipo,
        planoId: o.id,
        produtoId: o.produtoId,
        produtoNome: o.produtoNome,
        planoNome: o.planoNome,
        periodicidade: o.periodicidade,
        unidade: o.unidade,
        precoCentavos: o.precoCentavos,
        quantidade: 1,
        modalidade: o.unidade || 'hora',
      },
    ]);

  const remover = (key: string) => setCart((c) => c.filter((i) => i.key !== key));
  const total = cart.reduce((s, i) => s + itemTotal(i), 0);

  if (!negocio) return null;
  const contato = negocio.contato;

  const handleSubmit = async () => {
    if (!contato?.email && !form.email) {
      toast({ title: 'Contato sem e-mail', description: 'A contratação exige um e-mail.', variant: 'destructive' });
      return;
    }
    if (cart.length === 0) {
      toast({ title: 'Carrinho vazio', description: 'Adicione ao menos um produto.', variant: 'destructive' });
      return;
    }
    if (!form.nome_responsavel || !form.cpf_responsavel || !form.endereco || !form.cidade || !form.estado || !form.cep) {
      toast({ title: 'Preencha os dados obrigatórios', description: 'Nome, CPF, endereço, cidade, estado e CEP.', variant: 'destructive' });
      return;
    }

    setEnviando(true);
    try {
      const primeira = cart.find((i) => i.tipo === 'assinatura') ?? null;
      const dadosPessoa = {
        nome_responsavel: form.nome_responsavel,
        cpf_responsavel: form.cpf_responsavel,
        email: form.email || contato?.email || '',
        telefone: form.telefone || null,
        tipo_pessoa: form.tipo_pessoa,
        razao_social: form.tipo_pessoa === 'juridica' ? form.razao_social : null,
        cnpj: form.tipo_pessoa === 'juridica' ? form.cnpj : null,
        endereco: form.endereco,
        numero_endereco: form.numero_endereco || null,
        complemento_endereco: form.complemento_endereco || null,
        bairro: form.bairro || null,
        cidade: form.cidade,
        estado: form.estado,
        cep: form.cep,
        plano_id: primeira?.planoId ?? null,
        produto_id: primeira?.produtoId ?? null,
        plano_selecionado: primeira?.planoNome ?? null,
        produto_selecionado: primeira?.produtoNome ?? null,
        preco: primeira?.precoCentavos ?? null,
        status_contratacao: 'CONTRATO_ENVIADO',
        updated_at: new Date().toISOString(),
      };

      // 1. Cliente (reusa por e-mail se já existir)
      const email = dadosPessoa.email;
      const { data: existente } = await supabase
        .from('contratacoes_clientes')
        .select('id')
        .eq('email', email)
        .limit(1)
        .maybeSingle();

      let clienteId: string;
      if (existente?.id) {
        clienteId = existente.id;
        const { error } = await supabase.from('contratacoes_clientes').update(dadosPessoa as never).eq('id', clienteId);
        if (error) throw error;
      } else {
        const { data: novo, error } = await supabase
          .from('contratacoes_clientes')
          .insert(dadosPessoa as never)
          .select('id')
          .single();
        if (error || !novo) throw error ?? new Error('Falha ao criar cliente');
        clienteId = (novo as { id: string }).id;
      }

      // 2. Assinaturas (cada uma inicia em aguardando_assinatura)
      const hoje = new Date();
      const assinaturas = cart.filter((i) => i.tipo === 'assinatura');
      for (const a of assinaturas) {
        const { error } = await supabase.from('assinaturas').insert({
          cliente_id: clienteId,
          plano_id: a.planoId,
          produto_id: a.produtoId,
          status: 'aguardando_assinatura',
          data_contratacao: paraDataISO(hoje),
          data_inicio: paraDataISO(hoje),
          proximo_vencimento: paraDataISO(calcularProximoVencimento(hoje, a.periodicidade)),
          preco_snapshot_centavos: a.precoCentavos,
        } as never);
        if (error) throw error;
      }

      // 3. Avulsos (um pedido com os itens)
      const avulsos = cart.filter((i) => i.tipo === 'avulso');
      if (avulsos.length) {
        const { data: pedido, error: pedErr } = await supabase
          .from('pedidos')
          .insert({ cliente_id: clienteId, status: 'aberto' } as never)
          .select('id')
          .single();
        if (pedErr || !pedido) throw pedErr ?? new Error('Falha ao criar pedido');
        const pedidoId = (pedido as { id: string }).id;
        const { error: itensErr } = await supabase.from('pedido_itens').insert(
          avulsos.map((v) => ({
            pedido_id: pedidoId,
            produto_id: v.produtoId,
            plano_id: v.planoId,
            descricao: `${v.produtoNome} — ${v.planoNome} (${labelUnidade(v.modalidade)})`,
            quantidade: v.quantidade,
            unidade: v.modalidade,
            preco_unit_centavos: precoModalidadeCentavos(v.precoCentavos, v.modalidade),
          })) as never,
        );
        if (itensErr) throw itensErr;
      }

      // 4. Liga o negócio à contratação + move para "Contrato Enviado"
      const etapaContrato = etapas.find((e) => /contrato/i.test(e.nome)) ?? etapas.find((e) => e.tipo === 'aberto');
      atualizarNegocio.mutate({
        id: negocio.id,
        contratacao_id: clienteId,
        plano_id: primeira?.planoId ?? negocio.plano_id ?? null,
        valor_centavos: total || negocio.valor_centavos || null,
        etapa_id: etapaContrato?.id ?? negocio.etapa_id,
      });
      if (contato?.id) {
        await crmFrom('crm_contatos').update({ contratacao_id: clienteId }).eq('id', contato.id);
      }

      toast({
        title: 'Contratação iniciada',
        description: 'Cliente e produtos criados. Envie o contrato e emita a cobrança pela ficha do cliente.',
      });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro na contratação', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="border-b border-white/[0.06] px-6 py-5">
          <h2 className="text-lg font-bold">Iniciar contratação</h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Cria o cliente <strong className="text-foreground">{contato?.nome}</strong> e os produtos contratados. O
            contrato e a cobrança são feitos depois, pela ficha do cliente.
          </p>
        </div>

        <div className="max-h-[64vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Dados do cliente */}
          <section>
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Dados do cliente</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Tipo de pessoa</label>
                <select
                  value={form.tipo_pessoa}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_pessoa: e.target.value as Pessoa }))}
                  className={`${inputCls} cursor-pointer appearance-none`}
                >
                  <option value="fisica">Pessoa Física</option>
                  <option value="juridica">Pessoa Jurídica</option>
                </select>
              </div>
              <div>
                <label htmlFor="ic-cpf" className={labelCls}>CPF do responsável *</label>
                <input id="ic-cpf" value={form.cpf_responsavel} onChange={set('cpf_responsavel')} className={`${inputCls} on-num`} placeholder="000.000.000-00" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ic-nome" className={labelCls}>{form.tipo_pessoa === 'juridica' ? 'Nome do responsável *' : 'Nome completo *'}</label>
                <input id="ic-nome" value={form.nome_responsavel} onChange={set('nome_responsavel')} className={inputCls} />
              </div>
              {form.tipo_pessoa === 'juridica' && (
                <>
                  <div>
                    <label htmlFor="ic-razao" className={labelCls}>Razão social</label>
                    <input id="ic-razao" value={form.razao_social} onChange={set('razao_social')} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="ic-cnpj" className={labelCls}>CNPJ</label>
                    <input id="ic-cnpj" value={form.cnpj} onChange={set('cnpj')} className={`${inputCls} on-num`} />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="ic-email" className={labelCls}>E-mail *</label>
                <input id="ic-email" type="email" value={form.email} onChange={set('email')} className={inputCls} />
              </div>
              <div>
                <label htmlFor="ic-tel" className={labelCls}>Telefone</label>
                <input id="ic-tel" value={form.telefone} onChange={set('telefone')} className={`${inputCls} on-num`} />
              </div>
            </div>
          </section>

          {/* Endereço do cliente (próprio — o endereço fiscal é atribuído depois) */}
          <section className="border-t border-white/[0.06] pt-4">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Endereço do cliente</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="ic-end" className={labelCls}>Logradouro *</label>
                <input id="ic-end" value={form.endereco} onChange={set('endereco')} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ic-num" className={labelCls}>Número</label>
                <input id="ic-num" value={form.numero_endereco} onChange={set('numero_endereco')} className={inputCls} />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="ic-compl" className={labelCls}>Complemento</label>
                <input id="ic-compl" value={form.complemento_endereco} onChange={set('complemento_endereco')} className={inputCls} />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="ic-bairro" className={labelCls}>Bairro</label>
                <input id="ic-bairro" value={form.bairro} onChange={set('bairro')} className={inputCls} />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="ic-cidade" className={labelCls}>Cidade *</label>
                <input id="ic-cidade" value={form.cidade} onChange={set('cidade')} className={inputCls} />
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="ic-uf" className={labelCls}>UF *</label>
                <input id="ic-uf" value={form.estado} onChange={set('estado')} maxLength={2} className={inputCls} placeholder="PA" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ic-cep" className={labelCls}>CEP *</label>
                <input id="ic-cep" value={form.cep} onChange={set('cep')} className={`${inputCls} on-num`} placeholder="66000-000" />
              </div>
            </div>
          </section>

          {/* Produtos (carrinho) */}
          <section className="border-t border-white/[0.06] pt-4">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Produtos contratados</div>

            {cart.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {cart.map((i) => (
                  <div key={i.key} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0e0e11] px-3.5 py-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${i.tipo === 'avulso' ? 'bg-indigo-400/15 text-indigo-300' : 'bg-on-lime/10 text-on-lime'}`}>
                      {i.tipo === 'avulso' ? <ShoppingCart className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{i.produtoNome || i.planoNome}</div>
                      <div className="truncate text-[11px] text-muted-foreground/80">Oferta: {i.planoNome}</div>
                    </div>
                    {i.tipo === 'avulso' && (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={i.modalidade}
                          onChange={(e) => setCart((c) => c.map((x) => (x.key === i.key ? { ...x, modalidade: e.target.value } : x)))}
                          className="h-8 cursor-pointer appearance-none rounded-md border border-white/10 bg-[#0e0e11] px-2 text-[11.5px] outline-none"
                        >
                          {AVULSO_UNIDADES.map((u) => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={i.quantidade}
                          onChange={(e) => setCart((c) => c.map((x) => (x.key === i.key ? { ...x, quantidade: Math.max(1, parseInt(e.target.value) || 1) } : x)))}
                          className="on-num h-8 w-14 rounded-md border border-white/10 bg-[#0e0e11] px-2 text-[12px] outline-none"
                        />
                      </div>
                    )}
                    <div className="on-num shrink-0 text-[13px] font-semibold text-muted-foreground">{brl(itemTotal(i) / 100)}</div>
                    <button type="button" onClick={() => remover(i.key)} className="shrink-0 cursor-pointer text-muted-foreground hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Picker */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0e0e11] p-3">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-0.5 rounded-[9px] border border-white/10 bg-card p-[3px]">
                  <button type="button" onClick={() => setAba('assinatura')} className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] transition-colors ${aba === 'assinatura' ? 'bg-on-lime font-semibold text-on-black' : 'font-medium text-muted-foreground hover:text-foreground'}`}>
                    <Repeat className="h-3.5 w-3.5" /> Assinaturas
                  </button>
                  <button type="button" onClick={() => setAba('avulso')} className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] transition-colors ${aba === 'avulso' ? 'bg-on-lime font-semibold text-on-black' : 'font-medium text-muted-foreground hover:text-foreground'}`}>
                    <ShoppingCart className="h-3.5 w-3.5" /> Avulsos
                  </button>
                </div>
                <div className="relative min-w-[160px] flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto…" className="h-9 w-full rounded-[9px] border border-white/10 bg-card pl-8 pr-3 text-[13px] outline-none focus:border-on-lime/50" />
                </div>
              </div>
              <div className="flex max-h-[180px] flex-col gap-1.5 overflow-y-auto">
                {filtradas.length === 0 ? (
                  <div className="py-4 text-center text-[12px] text-muted-foreground/60">
                    {busca.trim() ? 'Nenhum resultado.' : 'Nenhum produto no catálogo.'}
                  </div>
                ) : (
                  filtradas.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => adicionar(o)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.06] px-3 py-2 text-left transition-colors hover:border-on-lime/40 hover:bg-on-lime/[0.04]"
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${o.tipo === 'avulso' ? 'bg-indigo-400/15 text-indigo-300' : 'bg-on-lime/10 text-on-lime'}`}>
                        {o.tipo === 'avulso' ? <ShoppingCart className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-semibold">{o.produtoNome || 'Produto'}</div>
                        <div className="truncate text-[11px] text-muted-foreground/80">Oferta: {o.planoNome} · {o.tipo === 'avulso' ? 'por hora (base)' : o.periodicidade}</div>
                      </div>
                      <span className="on-num text-[12.5px] font-semibold text-muted-foreground">{brl(o.precoCentavos / 100)}</span>
                      <Plus className="h-4 w-4 shrink-0 text-on-lime" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
          <div>
            <div className="text-[11.5px] text-muted-foreground/80">Total contratado</div>
            <div className="on-num text-xl font-bold text-on-lime">{brl(total / 100)}</div>
          </div>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => onOpenChange(false)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25">
              <X className="h-4 w-4" /> Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={enviando || cart.length === 0}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> {enviando ? 'Criando…' : 'Iniciar contratação'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IniciarContratacaoDialog;
