import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Check,
  Copy,
  KeyRound,
  Plus,
  Repeat,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/hooks/useProducts';
import { validateCPF, validateCNPJ, validateEmail } from '@/utils/validators';
import { formatCPF, formatCNPJ, formatPhone, formatCEP } from '@/utils/formatters';
import { AVULSO_UNIDADES, precoModalidadeCentavos, labelUnidade } from '@/utils/avulso';
import {
  criarClienteInterno,
  type ClienteItem,
  type CriarClienteResult,
  type StatusAssinatura,
  type StatusContratacao,
} from '@/utils/criarClienteInterno';
import { LIFECYCLE_COLUMNS, lifecycleToFunnel, type ClienteLifecycle } from './clientes/clienteStatus';
import { brl } from './clientes/clientesShared';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Mantido por compatibilidade de chamada; o cadastro manual é sempre criação. */
  client?: unknown;
  onSuccess: () => void;
}

type Pessoa = 'fisica' | 'juridica';

// Status do CLIENTE (ciclo de vida `ClienteLifecycle`) — mesma propriedade exibida na tela Clientes,
// independente das assinaturas. Um cliente pode ser "Ativo" mesmo sem nenhuma assinatura/avulso.
// Persistido no funil (`status_contratacao` via lifecycleToFunnel); com assinaturas, o ciclo de vida
// passa a ser derivado delas (clienteStatus.ts). Opções/labels reusam LIFECYCLE_COLUMNS (fonte única).
const STATUS_CLIENTE_OPTS: { value: ClienteLifecycle; label: string }[] = LIFECYCLE_COLUMNS.map((c) => ({
  value: c.key,
  label: c.label,
}));

// Status de cada ASSINATURA — valores persistidos reais (independentes do status do cliente).
const STATUS_ASSINATURA_OPTS: { value: StatusAssinatura; label: string }[] = [
  { value: 'ativo', label: 'Vigente' },
  { value: 'aguardando_assinatura', label: 'Aguardando assinatura' },
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { value: 'suspenso', label: 'Suspensa' },
  { value: 'cancelado', label: 'Cancelada' },
];

interface CartItem {
  key: string;
  tipo: 'assinatura' | 'avulso';
  planoId: string;
  produtoId: string;
  produtoNome: string;
  ofertaNome: string;
  periodicidade: string | null;
  unidade: string | null;
  precoCentavos: number; // assinatura: preço da oferta · avulso: preço/hora base
  // assinatura
  dataInicio: string; // YYYY-MM-DD
  statusAss: StatusAssinatura;
  // avulso
  quantidade: number;
  modalidade: string;
}

const inputCls =
  'h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50';
const selectCls = `${inputCls} cursor-pointer appearance-none`;
const labelCls = 'mb-1.5 block text-[11.5px] font-medium text-muted-foreground';

const hojeISO = () => new Date().toISOString().split('T')[0];

const emptyForm = {
  tipo_pessoa: 'fisica' as Pessoa,
  status: 'ativo' as ClienteLifecycle,
  nome_responsavel: '',
  razao_social: '',
  cpf_responsavel: '',
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
};

const itemTotal = (i: CartItem) =>
  i.tipo === 'avulso' ? precoModalidadeCentavos(i.precoCentavos, i.modalidade) * i.quantidade : i.precoCentavos;

const ClientFormModal = ({ isOpen, onClose, onSuccess }: ClientFormModalProps) => {
  const { toast } = useToast();
  const { produtos, planos } = useProducts();

  const [form, setForm] = useState(emptyForm);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [aba, setAba] = useState<'assinatura' | 'avulso'>('assinatura');
  const [busca, setBusca] = useState('');
  const [provisionar, setProvisionar] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<CriarClienteResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setCart([]);
      setAba('assinatura');
      setBusca('');
      setProvisionar(true);
      setSaving(false);
      setErrors({});
      setDone(null);
    }
  }, [isOpen]);

  // Catálogo: cada oferta (plano) com o tipo do produto.
  const opcoes = useMemo(
    () =>
      planos
        .filter((p) => p.ativo)
        .map((p) => {
          const prod = produtos.find((x) => x.id === p.produto_id);
          return {
            id: p.id,
            produtoId: p.produto_id,
            tipo: prod?.tipo === 'avulso' ? ('avulso' as const) : ('assinatura' as const),
            produtoNome: prod?.nome_produto ?? '',
            ofertaNome: p.nome_plano,
            periodicidade: p.periodicidade as string | null,
            unidade: p.unidade,
            precoCentavos: p.preco_em_centavos,
          };
        }),
    [planos, produtos],
  );

  const countAss = useMemo(() => opcoes.filter((o) => o.tipo === 'assinatura').length, [opcoes]);
  const countAvu = useMemo(() => opcoes.filter((o) => o.tipo === 'avulso').length, [opcoes]);
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return opcoes.filter(
      (o) => o.tipo === aba && (!q || o.produtoNome.toLowerCase().includes(q) || o.ofertaNome.toLowerCase().includes(q)),
    );
  }, [opcoes, aba, busca]);

  const total = cart.reduce((s, i) => s + itemTotal(i), 0);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));
  const setMasked = (k: keyof typeof form, fmt: (v: string) => string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: fmt(e.target.value) }));

  const adicionar = (o: (typeof opcoes)[number]) =>
    setCart((c) => [
      ...c,
      {
        key: `${o.id}-${Date.now()}`,
        tipo: o.tipo,
        planoId: o.id,
        produtoId: o.produtoId,
        produtoNome: o.produtoNome,
        ofertaNome: o.ofertaNome,
        periodicidade: o.periodicidade,
        unidade: o.unidade,
        precoCentavos: o.precoCentavos,
        dataInicio: hojeISO(),
        statusAss: 'ativo',
        quantidade: 1,
        modalidade: o.unidade || 'hora',
      },
    ]);
  const remover = (key: string) => setCart((c) => c.filter((i) => i.key !== key));
  const patch = (key: string, p: Partial<CartItem>) => setCart((c) => c.map((i) => (i.key === key ? { ...i, ...p } : i)));

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.nome_responsavel.trim()) errs.nome_responsavel = 'Informe o nome.';
    if (!form.email.trim()) errs.email = 'Informe o e-mail.';
    else if (!validateEmail(form.email)) errs.email = 'E-mail inválido.';
    if (!form.cpf_responsavel.trim()) errs.cpf_responsavel = 'Informe o CPF.';
    else if (!validateCPF(form.cpf_responsavel)) errs.cpf_responsavel = 'CPF inválido.';
    if (form.tipo_pessoa === 'juridica' && form.cnpj.trim() && !validateCNPJ(form.cnpj)) {
      errs.cnpj = 'CNPJ inválido.';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({ title: 'Revise o formulário', description: 'Há campos obrigatórios ou inválidos.', variant: 'destructive' });
      return;
    }

    const itens: ClienteItem[] = cart.map((i) =>
      i.tipo === 'assinatura'
        ? {
            tipo: 'assinatura',
            produto_id: i.produtoId,
            plano_id: i.planoId,
            produto_nome: i.produtoNome,
            oferta_nome: i.ofertaNome,
            periodicidade: i.periodicidade,
            preco_centavos: i.precoCentavos,
            data_inicio: i.dataInicio || null,
            status: i.statusAss,
          }
        : {
            tipo: 'avulso',
            produto_id: i.produtoId,
            plano_id: i.planoId,
            produto_nome: i.produtoNome,
            oferta_nome: i.ofertaNome,
            modalidade: i.modalidade,
            quantidade: i.quantidade,
            preco_unit_centavos: precoModalidadeCentavos(i.precoCentavos, i.modalidade),
          },
    );

    setSaving(true);
    try {
      const result = await criarClienteInterno({
        tipo_pessoa: form.tipo_pessoa,
        nome_responsavel: form.nome_responsavel.trim(),
        email: form.email,
        telefone: form.telefone || null,
        cpf_responsavel: form.cpf_responsavel || null,
        razao_social: form.razao_social || null,
        cnpj: form.cnpj || null,
        endereco: form.endereco || null,
        numero_endereco: form.numero_endereco || null,
        complemento_endereco: form.complemento_endereco || null,
        bairro: form.bairro || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        cep: form.cep || null,
        status_contratacao: lifecycleToFunnel(form.status) as StatusContratacao,
        itens,
        provisionarAcesso: provisionar,
      });

      onSuccess();
      setDone(result);

      if (result.provisionWarning) {
        toast({
          title: 'Cliente criado',
          description: `O acesso ao portal não pôde ser provisionado: ${result.provisionWarning}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: result.reused ? 'Cliente atualizado' : 'Cliente criado',
          description: `${form.nome_responsavel} foi salvo com sucesso.`,
        });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao criar cliente', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado', description: 'Conteúdo copiado para a área de transferência.' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const novoOutro = () => {
    setForm(emptyForm);
    setCart([]);
    setErrors({});
    setDone(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-hidden border-white/10 bg-card p-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-on-lime/10 text-on-lime">
            <UserPlus className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-lg font-bold">{done ? 'Cliente cadastrado' : 'Adicionar cliente'}</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {done
                ? 'Cadastro concluído. Veja o acesso gerado abaixo.'
                : 'Cliente, produtos contratados (opcional) e acesso ao portal — tudo interno.'}
            </p>
          </div>
        </div>

        {done ? (
          /* ---------------- Sucesso / credenciais ---------------- */
          <div className="space-y-4 px-6 py-6">
            <div className="flex items-center gap-3 rounded-[12px] border border-on-lime/25 bg-on-lime/[0.06] px-4 py-3.5">
              <Check className="h-5 w-5 shrink-0 text-on-lime" />
              <p className="text-[13px] text-foreground">
                {done.reused ? 'Cliente já existia — dados atualizados.' : 'Cliente criado com sucesso.'}
              </p>
            </div>

            {done.temporaryPassword ? (
              <div className="rounded-[12px] border border-white/[0.08] bg-[#0e0e11] p-4">
                <div className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                  <KeyRound className="h-3.5 w-3.5" /> Acesso ao portal
                </div>
                <div className="space-y-2.5">
                  <CredRow label="E-mail" value={done.email} onCopy={() => copy(done.email)} />
                  <CredRow label="Senha temporária" value={done.temporaryPassword} mono onCopy={() => copy(done.temporaryPassword!)} />
                </div>
                <p className="mt-3 text-[11.5px] text-muted-foreground/80">
                  Repasse estas credenciais ao cliente. No primeiro acesso ele será obrigado a trocar a senha.
                </p>
              </div>
            ) : done.provisionWarning ? (
              <div className="rounded-[12px] border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3.5 text-[12.5px] text-amber-200">
                O cliente foi criado, mas o acesso ao portal não pôde ser provisionado:{' '}
                <span className="font-medium">{done.provisionWarning}</span>. Você pode provisionar depois pela ficha do cliente.
              </div>
            ) : (
              <div className="rounded-[12px] border border-white/[0.08] bg-[#0e0e11] px-4 py-3.5 text-[12.5px] text-muted-foreground">
                Acesso ao portal não foi provisionado (opção desativada). Provisione depois pela ficha do cliente, se necessário.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={novoOutro}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
              >
                <UserPlus className="h-4 w-4" /> Adicionar outro
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)]"
              >
                <Check className="h-4 w-4" /> Concluir
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ---------------- Formulário ---------------- */}
            <div className="max-h-[66vh] space-y-5 overflow-y-auto px-6 py-5">
              {/* Dados do cliente */}
              <section>
                <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                  Dados do cliente
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Tipo de pessoa</label>
                    <select
                      value={form.tipo_pessoa}
                      onChange={(e) => setForm((s) => ({ ...s, tipo_pessoa: e.target.value as Pessoa }))}
                      className={selectCls}
                    >
                      <option value="fisica">Pessoa Física</option>
                      <option value="juridica">Pessoa Jurídica</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="cf-status" className={labelCls}>Status do cliente</label>
                    <select
                      id="cf-status"
                      value={form.status}
                      onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as ClienteLifecycle }))}
                      className={selectCls}
                    >
                      {STATUS_CLIENTE_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="cf-nome" className={labelCls}>
                      {form.tipo_pessoa === 'juridica' ? 'Nome do responsável *' : 'Nome completo *'}
                    </label>
                    <input id="cf-nome" value={form.nome_responsavel} onChange={set('nome_responsavel')} className={inputCls} />
                    {errors.nome_responsavel && <p className="mt-1 text-[11px] text-red-400">{errors.nome_responsavel}</p>}
                  </div>

                  <div>
                    <label htmlFor="cf-cpf" className={labelCls}>CPF do responsável *</label>
                    <input id="cf-cpf" value={form.cpf_responsavel} onChange={setMasked('cpf_responsavel', formatCPF)} className={`${inputCls} on-num`} placeholder="000.000.000-00" />
                    {errors.cpf_responsavel && <p className="mt-1 text-[11px] text-red-400">{errors.cpf_responsavel}</p>}
                  </div>
                  <div>
                    <label htmlFor="cf-tel" className={labelCls}>Telefone</label>
                    <input id="cf-tel" value={form.telefone} onChange={setMasked('telefone', formatPhone)} className={`${inputCls} on-num`} placeholder="(11) 99999-9999" />
                  </div>

                  {form.tipo_pessoa === 'juridica' && (
                    <>
                      <div>
                        <label htmlFor="cf-razao" className={labelCls}>Razão social</label>
                        <input id="cf-razao" value={form.razao_social} onChange={set('razao_social')} className={inputCls} />
                      </div>
                      <div>
                        <label htmlFor="cf-cnpj" className={labelCls}>CNPJ</label>
                        <input id="cf-cnpj" value={form.cnpj} onChange={setMasked('cnpj', formatCNPJ)} className={`${inputCls} on-num`} placeholder="00.000.000/0000-00" />
                        {errors.cnpj && <p className="mt-1 text-[11px] text-red-400">{errors.cnpj}</p>}
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2">
                    <label htmlFor="cf-email" className={labelCls}>E-mail *</label>
                    <input id="cf-email" type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="cliente@email.com" />
                    {errors.email && <p className="mt-1 text-[11px] text-red-400">{errors.email}</p>}
                  </div>
                </div>
              </section>

              {/* Endereço */}
              <section className="border-t border-white/[0.06] pt-4">
                <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Endereço</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                  <div className="sm:col-span-4">
                    <label htmlFor="cf-end" className={labelCls}>Logradouro</label>
                    <input id="cf-end" value={form.endereco} onChange={set('endereco')} className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="cf-num" className={labelCls}>Número</label>
                    <input id="cf-num" value={form.numero_endereco} onChange={set('numero_endereco')} className={inputCls} />
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor="cf-compl" className={labelCls}>Complemento</label>
                    <input id="cf-compl" value={form.complemento_endereco} onChange={set('complemento_endereco')} className={inputCls} />
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor="cf-bairro" className={labelCls}>Bairro</label>
                    <input id="cf-bairro" value={form.bairro} onChange={set('bairro')} className={inputCls} />
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor="cf-cidade" className={labelCls}>Cidade</label>
                    <input id="cf-cidade" value={form.cidade} onChange={set('cidade')} className={inputCls} />
                  </div>
                  <div className="sm:col-span-1">
                    <label htmlFor="cf-uf" className={labelCls}>UF</label>
                    <input id="cf-uf" value={form.estado} onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value.toUpperCase().slice(0, 2) }))} maxLength={2} className={inputCls} placeholder="PA" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="cf-cep" className={labelCls}>CEP</label>
                    <input id="cf-cep" value={form.cep} onChange={setMasked('cep', formatCEP)} className={`${inputCls} on-num`} placeholder="66000-000" />
                  </div>
                </div>
              </section>

              {/* Produtos contratados */}
              <section className="border-t border-white/[0.06] pt-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Produtos contratados</span>
                  <span className="on-pill bg-white/10 text-[9.5px] text-muted-foreground">opcional</span>
                </div>
                <p className="mb-2.5 text-[11.5px] text-muted-foreground/80">
                  Registre as assinaturas (com o período contratado) e/ou os avulsos. Pode deixar vazio e vender depois pela ficha.
                </p>

                {/* Itens no carrinho */}
                {cart.length > 0 && (
                  <div className="mb-3 flex flex-col gap-2">
                    {cart.map((i) => (
                      <div key={i.key} className="rounded-xl border border-white/[0.08] bg-[#0e0e11] px-3.5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${i.tipo === 'avulso' ? 'bg-indigo-400/15 text-indigo-300' : 'bg-on-lime/10 text-on-lime'}`}>
                            {i.tipo === 'avulso' ? <ShoppingCart className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold">{i.produtoNome || i.ofertaNome}</div>
                            <div className="truncate text-[11px] text-muted-foreground/80">
                              Oferta: {i.ofertaNome} · {i.tipo === 'avulso' ? 'avulso' : i.periodicidade || 'recorrente'}
                            </div>
                          </div>
                          <div className="on-num shrink-0 text-[13px] font-semibold text-muted-foreground">{brl(itemTotal(i) / 100)}</div>
                          <button type="button" onClick={() => remover(i.key)} className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-red-300">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Controles por tipo */}
                        {i.tipo === 'assinatura' ? (
                          <div className="mt-2.5 grid grid-cols-2 gap-2.5 border-t border-white/[0.05] pt-2.5">
                            <div>
                              <label className="mb-1 block text-[10.5px] text-muted-foreground/70">Início do período</label>
                              <input
                                type="date"
                                value={i.dataInicio}
                                onChange={(e) => patch(i.key, { dataInicio: e.target.value })}
                                className="on-num h-8 w-full rounded-md border border-white/10 bg-card px-2 text-[12px] outline-none transition-colors focus:border-on-lime/50"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10.5px] text-muted-foreground/70">Status da assinatura</label>
                              <select
                                value={i.statusAss}
                                onChange={(e) => patch(i.key, { statusAss: e.target.value as StatusAssinatura })}
                                className="h-8 w-full cursor-pointer appearance-none rounded-md border border-white/10 bg-card px-2 text-[12px] outline-none transition-colors focus:border-on-lime/50"
                              >
                                {STATUS_ASSINATURA_OPTS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2.5 grid grid-cols-2 gap-2.5 border-t border-white/[0.05] pt-2.5">
                            <div>
                              <label className="mb-1 block text-[10.5px] text-muted-foreground/70">Modalidade</label>
                              <select
                                value={i.modalidade}
                                onChange={(e) => patch(i.key, { modalidade: e.target.value })}
                                className="h-8 w-full cursor-pointer appearance-none rounded-md border border-white/10 bg-card px-2 text-[12px] outline-none transition-colors focus:border-on-lime/50"
                              >
                                {AVULSO_UNIDADES.map((u) => (
                                  <option key={u.value} value={u.value}>{u.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-[10.5px] text-muted-foreground/70">Quantidade</label>
                              <input
                                type="number"
                                min={1}
                                value={i.quantidade}
                                onChange={(e) => patch(i.key, { quantidade: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="on-num h-8 w-full rounded-md border border-white/10 bg-card px-2 text-[12px] outline-none transition-colors focus:border-on-lime/50"
                              />
                              <p className="mt-1 text-[10.5px] text-muted-foreground/70">
                                {i.quantidade}× {labelUnidade(i.modalidade)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Picker de ofertas */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0e0e11] p-3">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-0.5 rounded-[9px] border border-white/10 bg-card p-[3px]">
                      <button
                        type="button"
                        onClick={() => setAba('assinatura')}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] transition-colors ${aba === 'assinatura' ? 'bg-on-lime font-semibold text-on-black' : 'font-medium text-muted-foreground hover:text-foreground'}`}
                      >
                        <Repeat className="h-3.5 w-3.5" /> Assinaturas ({countAss})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAba('avulso')}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] transition-colors ${aba === 'avulso' ? 'bg-on-lime font-semibold text-on-black' : 'font-medium text-muted-foreground hover:text-foreground'}`}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" /> Avulsos ({countAvu})
                      </button>
                    </div>
                    <div className="relative min-w-[160px] flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                      <input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar produto ou oferta…"
                        className="h-9 w-full rounded-[9px] border border-white/10 bg-card pl-8 pr-3 text-[13px] outline-none transition-colors focus:border-on-lime/50"
                      />
                    </div>
                  </div>
                  <div className="flex max-h-[180px] flex-col gap-1.5 overflow-y-auto">
                    {filtradas.length === 0 ? (
                      <div className="py-4 text-center text-[12px] text-muted-foreground/60">
                        {busca.trim() ? 'Nenhum resultado.' : `Nenhum produto de ${aba === 'avulso' ? 'avulso' : 'assinatura'} no catálogo.`}
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
                            <div className="truncate text-[11px] text-muted-foreground/80">
                              Oferta: {o.ofertaNome} · {o.tipo === 'avulso' ? 'por hora (base)' : o.periodicidade || 'recorrente'}
                            </div>
                          </div>
                          <span className="on-num text-[12.5px] font-semibold text-muted-foreground">{brl(o.precoCentavos / 100)}</span>
                          <Plus className="h-4 w-4 shrink-0 text-on-lime" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* Acesso ao portal */}
              <section className="border-t border-white/[0.06] pt-4">
                <button
                  type="button"
                  onClick={() => setProvisionar((v) => !v)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-[11px] border border-white/[0.08] bg-[#0e0e11] px-3.5 py-3 text-left transition-colors hover:border-white/20"
                >
                  <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${provisionar ? 'bg-on-lime' : 'bg-white/15'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${provisionar ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                      <KeyRound className="h-3.5 w-3.5 text-on-lime" /> Provisionar acesso ao portal agora
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-muted-foreground/80">
                      Gera o login e uma senha temporária para o cliente. Você verá as credenciais ao concluir.
                    </span>
                  </span>
                </button>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
              <div>
                <div className="text-[11.5px] text-muted-foreground/80">{cart.length > 0 ? 'Total contratado' : 'Produtos'}</div>
                {cart.length > 0 ? (
                  <div className="on-num text-xl font-bold text-on-lime">{brl(total / 100)}</div>
                ) : (
                  <div className="text-[15px] font-semibold text-muted-foreground">Nenhum produto</div>
                )}
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> {saving ? 'Criando…' : 'Criar cliente'}
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CredRow: React.FC<{ label: string; value: string; mono?: boolean; onCopy: () => void }> = ({
  label,
  value,
  mono,
  onCopy,
}) => (
  <div className="flex items-center gap-3">
    <span className="w-28 shrink-0 text-[11.5px] text-muted-foreground/80">{label}</span>
    <span className={`flex-1 truncate text-[13px] ${mono ? 'on-num font-semibold tracking-wide' : ''}`}>{value}</span>
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-on-lime/40 hover:text-on-lime"
    >
      <Copy className="h-3.5 w-3.5" /> Copiar
    </button>
  </div>
);

export default ClientFormModal;
