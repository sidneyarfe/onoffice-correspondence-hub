import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Pencil,
  Camera,
  Save,
  X,
  Mail,
  MessageCircle,
  FileText,
  Download,
  Trash2,
  Plus,
  Repeat,
  ShoppingCart,
  Send,
  ChevronDown,
  Pause,
  Play,
  Ban,
  CreditCard,
  RefreshCw,
  ChevronRight,
  Receipt,
  FileSignature,
} from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import { useClienteFicha } from '@/hooks/useClienteFicha';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { calcularProximoVencimento, paraDataISO } from '@/utils/vencimento';
import {
  TypePill,
  ClientAvatar,
  brl,
  brlCentavos,
  docDe,
  isPJ,
} from './clientesShared';
import {
  ClienteLifecyclePill,
  AssinaturaStatusPill,
  StatusStepper,
  deriveClienteLifecycle,
  deriveAssinaturaStatus,
  assinaturaStepper,
  faturamentoGeradoCentavos,
  buildPeriodos,
  codigoFatura,
  LIFECYCLE_DESC,
} from './clienteStatus';
import { abrirContratoAssinado, uploadAvatar } from './clientesStorage';
import { useClienteComercio, type AssinaturaItem, type AvulsoItem } from '@/hooks/useClienteComercio';
import VenderProdutoModal from './VenderProdutoModal';
import EnviarContratoModal from './EnviarContratoModal';
import AssinaturaAcaoModal, { type AssinaturaAcao } from './AssinaturaAcaoModal';
import RegistrarContratoAssinaturaModal from './RegistrarContratoAssinaturaModal';
import EmitirCobrancaModal, { type CobrancaAlvo } from './EmitirCobrancaModal';
import FaturaModal, { type FaturaGerencia } from './FaturaModal';
import ExcluirDocAssinaturaModal, { type DocAlvo } from './ExcluirDocAssinaturaModal';
import NewCorrespondenceModal from '../NewCorrespondenceModal';
import AnexarDocumentoModal from './AnexarDocumentoModal';
import EnderecoFiscalDocs from './EnderecoFiscalDocs';
import { assinaturaIdDoDoc } from './docPin';
import { registrarAtividade, humanizarAcao } from '@/utils/atividade';
import { useToast } from '@/hooks/use-toast';

type FichaTab = 'cadastro' | 'financeiro' | 'correspondencias' | 'documentos' | 'atividades';

interface ClienteFichaProps {
  client: AdminClient;
  onBack: () => void;
  /** mantido para compat com AdminClients — a cobrança agora é por assinatura */
  onCobrar: () => void;
  onRegistrarContrato: () => void;
  onExcluir: () => void;
  /** chamado após salvar a edição inline do cadastro — recarrega os dados */
  onSaved: () => void;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">{children}</div>
);

const Field: React.FC<{ label: string; value?: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div className="mb-0.5 text-[11.5px] text-muted-foreground/80">{label}</div>
    <div className={`text-[13.5px] text-foreground ${mono ? 'on-num' : ''}`}>{value || '—'}</div>
  </div>
);

// ---- edição inline da aba Cadastro ----
interface CadastroDraft {
  name: string;
  doc: string;
  email: string;
  phone: string;
  endereco: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  planoId: string;
  avatar_url?: string;
}

const editInputCls =
  'h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50';
const editLabelCls = 'mb-1.5 block text-[11.5px] font-medium text-muted-foreground';

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
};

/** Link wa.me a partir do telefone (DDI 55 quando faltar). */
const waLink = (phone?: string) => {
  const tel = (phone || '').replace(/\D/g, '');
  if (!tel) return null;
  const ddi = tel.length <= 11 ? `55${tel}` : tel;
  return `https://wa.me/${ddi}?text=${encodeURIComponent('Olá! Aqui é da ON Office.')}`;
};

/** Heurística: a assinatura é o serviço de Endereço Fiscal? */
const ehEnderecoFiscal = (nome?: string) => {
  const n = (nome || '').toLowerCase();
  return n.includes('endere') && n.includes('fiscal');
};


const ClienteFicha: React.FC<ClienteFichaProps> = ({ client, onBack, onExcluir, onSaved }) => {
  const [tab, setTab] = useState<FichaTab>('cadastro');
  const { toast } = useToast();
  const { produtos, planos } = useProducts();
  const ficha = useClienteFicha(client.id, client.user_id);
  const comercio = useClienteComercio(client.id);
  const [vendaOpen, setVendaOpen] = useState(false);
  const [enviarContratoOpen, setEnviarContratoOpen] = useState(false);
  const [corrOpen, setCorrOpen] = useState(false);
  const [anexarOpen, setAnexarOpen] = useState(false);
  const [expandedAss, setExpandedAss] = useState<string | null>(null);
  const [acaoTarget, setAcaoTarget] = useState<{ assinatura: AssinaturaItem; acao: AssinaturaAcao } | null>(null);
  const [contratoTarget, setContratoTarget] = useState<AssinaturaItem | null>(null);
  const [cobrancaAlvo, setCobrancaAlvo] = useState<CobrancaAlvo | null>(null);
  const [faturaTarget, setFaturaTarget] = useState<{ assinatura: AssinaturaItem; fatura: FaturaGerencia } | null>(null);
  const [docExcluir, setDocExcluir] = useState<{ assinatura: AssinaturaItem; doc: DocAlvo } | null>(null);

  // monta o alvo de cobrança: emitir (onboarding), renovar (inadimplente) ou antecipada (vigente)
  const cobrarAssinatura = (a: AssinaturaItem, modo: 'cobrar' | 'renovar' | 'antecipada') => {
    const renovar = modo !== 'cobrar';
    setCobrancaAlvo({
      titulo: modo === 'antecipada' ? 'Renovação antecipada' : modo === 'renovar' ? 'Renovar' : 'Emitir cobrança',
      descricao: `${renovar ? 'Renovação' : 'Cobrança'}: ${a.produtoNome ? `${a.produtoNome} — ` : ''}${a.planoNome}`,
      valorCentavos: a.precoCentavos,
      produtoNome: a.produtoNome || a.planoNome,
      assinaturaId: a.id,
      renovacao: renovar
        ? { assinaturaId: a.id, proximoVencimento: a.proximoVencimento, periodicidade: a.periodicidade }
        : undefined,
    });
  };

  const lifecycle = useMemo(() => deriveClienteLifecycle(comercio.assinaturas), [comercio.assinaturas]);
  const faturamento = useMemo(
    () => faturamentoGeradoCentavos(comercio.assinaturas, comercio.avulsos),
    [comercio.assinaturas, comercio.avulsos],
  );
  const ativas = useMemo(
    () => comercio.assinaturas.filter((a) => a.status !== 'cancelado'),
    [comercio.assinaturas],
  );
  // Documentos fixados em cada assinatura (contrato/comprovante) — via convenção na descrição
  const docsDaAssinatura = (assinaturaId: string) =>
    ficha.documentos.filter((d) => assinaturaIdDoDoc(d.descricao) === assinaturaId);

  const cobrarPedido = (v: AvulsoItem) => {
    if (!client.user_id) {
      toast({ title: 'Cliente sem acesso', description: 'Provisione o usuário do cliente antes de cobrar.', variant: 'destructive' });
      return;
    }
    setCobrancaAlvo({
      titulo: 'Cobrar pedido avulso',
      descricao: `Avulso: ${v.descricao || v.produtoNome}`,
      valorCentavos: v.precoUnitCentavos * v.quantidade,
      produtoNome: v.produtoNome || v.descricao,
    });
  };

  const faturaPill = (status: string) =>
    status === 'paga'
      ? 'bg-on-lime/15 text-on-lime'
      : status === 'vencida'
      ? 'bg-red-500/15 text-red-300'
      : status === 'cancelada'
      ? 'bg-white/[0.07] text-muted-foreground'
      : 'bg-orange-400/15 text-orange-300';
  const wa = waLink(client.telefone);

  // ---- edição inline do cadastro ----
  const buildDraft = (): CadastroDraft => ({
    name: client.name,
    doc: isPJ(client) ? client.cnpj : client.cpf_responsavel,
    email: client.email,
    phone: client.telefone,
    endereco: client.endereco,
    bairro: client.bairro || '',
    cep: client.cep,
    cidade: client.cidade,
    estado: client.estado,
    planoId: client.plano_id || '',
    avatar_url: client.avatar_url,
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<CadastroDraft>(buildDraft);

  const setField = (k: keyof CadastroDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const startEdit = () => {
    setDraft(buildDraft());
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);

  const planoOptions = useMemo(() => {
    const nome = (pid: string) => produtos.find((p) => p.id === pid)?.nome_produto || '';
    return planos.filter((p) => p.ativo).map((p) => ({ id: p.id, label: `${nome(p.produto_id)} — ${p.nome_plano}` }));
  }, [planos, produtos]);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(client.id, file);
      setDraft((d) => ({ ...d, avatar_url: url }));
      toast({ title: 'Foto carregada', description: 'Salve para confirmar a alteração.' });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao enviar a foto',
        description: 'Verifique se o bucket de avatars foi criado pela migração.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        email: draft.email,
        telefone: draft.phone,
        endereco: draft.endereco,
        bairro: draft.bairro || null,
        cidade: draft.cidade,
        estado: draft.estado,
        cep: draft.cep,
        avatar_url: draft.avatar_url || null,
        updated_at: new Date().toISOString(),
      };
      if (isPJ(client)) {
        payload.razao_social = draft.name;
        payload.cnpj = draft.doc;
      } else {
        payload.nome_responsavel = draft.name;
        payload.cpf_responsavel = draft.doc;
      }

      // Troca de plano (modelo single-plan legado) → espelha plano/produto/preço/vencimento.
      if (draft.planoId && draft.planoId !== client.plano_id) {
        const { data: planoInfo, error: planoErr } = await supabase
          .from('planos')
          .select('id, nome_plano, periodicidade, produto_id, preco_em_centavos, produtos:produto_id ( nome_produto )')
          .eq('id', draft.planoId)
          .single();
        if (planoErr) throw planoErr;
        const produtoRel = (planoInfo as { produtos?: { nome_produto?: string } | null }).produtos;
        payload.plano_id = planoInfo.id;
        payload.plano_selecionado = planoInfo.nome_plano;
        payload.produto_id = planoInfo.produto_id;
        payload.produto_selecionado = produtoRel?.nome_produto || null;
        payload.preco = planoInfo.preco_em_centavos;
        payload.proximo_vencimento = paraDataISO(calcularProximoVencimento(new Date(), planoInfo.periodicidade));
      }

      const { error } = await supabase
        .from('contratacoes_clientes')
        .update(payload as never)
        .eq('id', client.id);
      if (error) throw error;

      toast({ title: 'Cadastro atualizado', description: 'Os dados do cliente foram salvos.' });
      registrarAtividade(client.user_id, 'cadastro_atualizado', 'Cadastro do cliente atualizado pelo admin.');
      setEditing(false);
      onSaved();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao salvar', description: 'Não foi possível atualizar o cliente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const previewClient: AdminClient = { ...client, name: draft.name, avatar_url: draft.avatar_url };

  const tabs: { key: FichaTab; label: string }[] = [
    { key: 'cadastro', label: 'Cadastro' },
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'correspondencias', label: `Correspondências${client.correspondences ? ` · ${client.correspondences}` : ''}` },
    { key: 'documentos', label: 'Documentos' },
    { key: 'atividades', label: 'Atividades' },
  ];

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para clientes
      </button>

      {/* Header card — contato apenas */}
      <div className="mb-4 rounded-2xl border border-white/[0.08] bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <ClientAvatar client={client} size={54} rounded="0.8rem" />
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <TypePill client={client} />
                {!comercio.loading && <ClienteLifecyclePill status={lifecycle} />}
              </div>
              <h1 className="mb-1 text-2xl font-extrabold tracking-tight">{client.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                <span className="on-num">{docDe(client)}</span>
                <span>{client.email}</span>
                <span className="on-num">{client.telefone}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-on-lime/30 bg-on-lime/10 px-3.5 py-2 text-[13px] font-semibold text-on-lime transition-colors hover:bg-on-lime/20"
              >
                <MessageCircle className="h-[15px] w-[15px]" /> WhatsApp
              </a>
            )}
            <a
              href={`mailto:${client.email}`}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-white/25"
            >
              <Mail className="h-[15px] w-[15px]" /> E-mail
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-3.5">
          {/* Resumo do cliente */}
          <div className="rounded-2xl border border-white/[0.08] bg-card p-[18px]">
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                Resumo do cliente
              </span>
              {!comercio.loading && <ClienteLifecyclePill status={lifecycle} />}
            </div>
            <div className="flex flex-col gap-3.5">
              <Field label={isPJ(client) ? 'Razão social' : 'Nome'} value={<span className="font-semibold">{client.name}</span>} />
              <div>
                <div className="mb-1 text-[11.5px] text-muted-foreground/80">Telefone</div>
                <div className="flex items-center gap-2">
                  <span className="on-num text-[13.5px]">{client.telefone || '—'}</span>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      title="Conversar no WhatsApp"
                      className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-on-lime/10 text-on-lime transition-colors hover:bg-on-lime/20"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
              <div>
                <div className="mb-0.5 text-[11.5px] text-muted-foreground/80">E-mail</div>
                <a href={`mailto:${client.email}`} className="text-[13.5px] text-foreground transition-colors hover:text-on-lime">
                  {client.email || '—'}
                </a>
              </div>
              <Field
                label="Endereço"
                value={
                  <span className="leading-relaxed">
                    {client.endereco}
                    {client.bairro ? `, ${client.bairro}` : ''}
                    <br />
                    {client.cidade} — {client.estado} · <span className="on-num">{client.cep}</span>
                  </span>
                }
              />
              <Field label="Cliente desde" value={client.joinDate} mono />

              <div className="border-t border-white/[0.06] pt-3.5">
                <div className="mb-1.5 text-[11.5px] text-muted-foreground/80">Produtos contratados</div>
                {comercio.loading ? (
                  <div className="text-[12.5px] text-muted-foreground/60">Carregando…</div>
                ) : ativas.length === 0 && comercio.avulsos.length === 0 ? (
                  <div className="text-[12.5px] text-muted-foreground/60">Nenhum produto contratado.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {ativas.map((a) => (
                      <div key={a.id} className="flex items-start gap-2 text-[12.5px]">
                        <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0 text-on-lime/70" />
                        <span className="min-w-0 break-words leading-snug">
                          {a.produtoNome ? `${a.produtoNome} — ` : ''}
                          {a.planoNome}
                        </span>
                      </div>
                    ))}
                    {comercio.avulsos.length > 0 && (
                      <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                        <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-indigo-300/70" />
                        <span>{comercio.avulsos.length} pedido(s) avulso(s)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.06] pt-3.5">
                <div className="mb-0.5 text-[11.5px] text-muted-foreground/80">Faturamento gerado (estimado)</div>
                <div className="on-num text-base font-semibold text-on-lime">{brlCentavos(faturamento)}</div>
              </div>
            </div>
          </div>

          {/* Situação do cliente — reflete o status de ciclo de vida */}
          <div className="rounded-2xl border border-white/[0.08] bg-card p-[18px]">
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                Situação do cliente
              </span>
              {!comercio.loading && <ClienteLifecyclePill status={lifecycle} />}
            </div>
            {comercio.loading ? (
              <div className="py-2 text-[12.5px] text-muted-foreground/60">Carregando…</div>
            ) : (
              <>
                <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">{LIFECYCLE_DESC[lifecycle]}</p>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/55">
                  Assinaturas
                </div>
                {ativas.length === 0 ? (
                  <div className="text-[12px] text-muted-foreground/60">Nenhuma assinatura ativa.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {ativas.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">
                          {a.produtoNome || a.planoNome}
                        </span>
                        <AssinaturaStatusPill status={deriveAssinaturaStatus(a)} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column — tabs */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
          <div className="flex gap-0.5 overflow-x-auto border-b border-white/[0.06] p-1.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  tab === t.key ? 'bg-on-lime/15 text-on-lime' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'cadastro' && (
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {editing ? 'Editar cadastro' : 'Dados cadastrais'}
                  </div>
                  {!editing ? (
                    <button
                      onClick={startEdit}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:border-white/25"
                    >
                      <Pencil className="h-[13px] w-[13px]" /> Editar
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:border-white/25 disabled:opacity-60"
                      >
                        <X className="h-[13px] w-[13px]" /> Cancelar
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving || uploading}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-on-lime px-3.5 py-1.5 text-[12.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_18px_rgba(96,255,0,0.35)] disabled:opacity-60"
                      >
                        <Save className="h-[13px] w-[13px]" /> {saving ? 'Salvando…' : 'Salvar'}
                      </button>
                    </div>
                  )}
                </div>

                {editing ? (
                  <div>
                    <div className="mb-5 flex items-center gap-4">
                      <label className="relative shrink-0 cursor-pointer">
                        <ClientAvatar client={previewClient} size={56} rounded="0.9rem" />
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-card bg-on-lime text-on-black">
                          <Camera className="h-3 w-3" />
                        </span>
                        <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" disabled={uploading} />
                      </label>
                      <div>
                        <div className="text-sm font-semibold">Foto do cliente</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {uploading ? 'Enviando…' : 'Clique para enviar uma imagem (opcional).'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label htmlFor="ed-nome" className={editLabelCls}>
                          {isPJ(client) ? 'Razão social' : 'Nome completo'}
                        </label>
                        <input id="ed-nome" value={draft.name} onChange={setField('name')} className={editInputCls} />
                      </div>
                      <div>
                        <label htmlFor="ed-doc" className={editLabelCls}>{isPJ(client) ? 'CNPJ' : 'CPF'}</label>
                        <input id="ed-doc" value={draft.doc} onChange={setField('doc')} className={`${editInputCls} on-num`} />
                      </div>
                      <div>
                        <label htmlFor="ed-plano" className={editLabelCls}>Plano</label>
                        <select
                          id="ed-plano"
                          value={draft.planoId}
                          onChange={(e) => setDraft((d) => ({ ...d, planoId: e.target.value }))}
                          className={`${editInputCls} cursor-pointer appearance-none`}
                        >
                          <option value="">{client.plan || 'Sem plano'}</option>
                          {planoOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="ed-email" className={editLabelCls}>E-mail</label>
                        <input id="ed-email" type="email" value={draft.email} onChange={setField('email')} className={editInputCls} />
                      </div>
                      <div>
                        <label htmlFor="ed-tel" className={editLabelCls}>Telefone</label>
                        <input id="ed-tel" value={draft.phone} onChange={setField('phone')} className={`${editInputCls} on-num`} />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="ed-end" className={editLabelCls}>Logradouro e número</label>
                        <input id="ed-end" value={draft.endereco} onChange={setField('endereco')} className={editInputCls} />
                      </div>
                      <div>
                        <label htmlFor="ed-bairro" className={editLabelCls}>Bairro</label>
                        <input id="ed-bairro" value={draft.bairro} onChange={setField('bairro')} className={editInputCls} />
                      </div>
                      <div>
                        <label htmlFor="ed-cep" className={editLabelCls}>CEP</label>
                        <input id="ed-cep" value={draft.cep} onChange={setField('cep')} className={`${editInputCls} on-num`} />
                      </div>
                      <div>
                        <label htmlFor="ed-cidade" className={editLabelCls}>Cidade</label>
                        <input id="ed-cidade" value={draft.cidade} onChange={setField('cidade')} className={editInputCls} />
                      </div>
                      <div>
                        <label htmlFor="ed-estado" className={editLabelCls}>Estado</label>
                        <input id="ed-estado" value={draft.estado} onChange={setField('estado')} className={editInputCls} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <SectionTitle>{isPJ(client) ? 'Dados da empresa' : 'Dados pessoais'}</SectionTitle>
                        <div className="flex flex-col gap-3.5">
                          <Field label={isPJ(client) ? 'Razão social' : 'Nome completo'} value={client.name} />
                          <Field label={isPJ(client) ? 'CNPJ' : 'CPF'} value={docDe(client)} mono />
                          <Field label="Tipo" value={isPJ(client) ? 'Pessoa Jurídica' : 'Pessoa Física'} />
                        </div>
                      </div>
                      <div>
                        <SectionTitle>Contato</SectionTitle>
                        <div className="flex flex-col gap-3.5">
                          <Field label="E-mail" value={client.email} />
                          <Field label="Telefone" value={client.telefone} mono />
                        </div>
                      </div>
                      <div className="border-t border-white/[0.06] pt-4 sm:col-span-2">
                        <SectionTitle>Endereço do cliente</SectionTitle>
                        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                          <div className="col-span-2 sm:col-span-1">
                            <Field label="Logradouro" value={client.endereco} />
                          </div>
                          <Field label="Bairro" value={client.bairro} />
                          <Field label="CEP" value={client.cep} mono />
                          <Field label="Cidade" value={client.cidade} />
                          <Field label="Estado" value={client.estado} />
                        </div>
                      </div>
                    </div>

                    {/* Zona de perigo — encerrar/excluir o cliente */}
                    <div className="mt-6 rounded-xl border border-red-500/15 bg-red-500/[0.03] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[12.5px] font-semibold text-red-200">Encerrar cliente</div>
                          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                            Cancelar a contratação (reversível) ou excluir o registro definitivamente.
                          </div>
                        </div>
                        <button
                          onClick={onExcluir}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/25 px-3.5 py-2 text-[13px] font-medium text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-[15px] w-[15px]" /> Encerrar / Excluir
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'financeiro' && (
              <div>
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle>Assinaturas &amp; avulsos</SectionTitle>
                  <button
                    onClick={() => setVendaOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:border-white/25"
                  >
                    <Plus className="h-[13px] w-[13px]" /> Vender produto
                  </button>
                </div>

                {/* Assinaturas (recorrentes) */}
                <div className="mb-2 text-[11.5px] font-semibold text-muted-foreground/80">Assinaturas (recorrentes)</div>
                {comercio.loading ? (
                  <div className="py-3 text-center text-[12.5px] text-muted-foreground/60">Carregando…</div>
                ) : comercio.assinaturas.length === 0 ? (
                  <div className="mb-5 rounded-xl border border-dashed border-white/[0.1] px-4 py-4 text-center text-[12.5px] text-muted-foreground/60">
                    Nenhuma assinatura. Use "Vender produto" para contratar.
                  </div>
                ) : (
                  <div className="mb-5 flex flex-col gap-2.5">
                    {comercio.assinaturas.map((a) => {
                      const sStatus = deriveAssinaturaStatus(a);
                      const expanded = expandedAss === a.id;
                      const cancelada = a.status === 'cancelado';
                      const suspensa = a.status === 'suspenso';
                      const periodos = expanded ? buildPeriodos(a) : [];
                      const pinned = expanded ? docsDaAssinatura(a.id) : [];
                      return (
                        <div key={a.id} className={`overflow-hidden rounded-xl border border-white/[0.06] bg-[#0e0e11] ${cancelada ? 'opacity-60' : ''}`}>
                          <div className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-on-lime/10 text-on-lime">
                                <Repeat className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="truncate text-[13.5px] font-semibold">{a.produtoNome || 'Produto'}</span>
                                  <AssinaturaStatusPill status={sStatus} />
                                </div>
                                <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground/80">
                                  <span className="text-muted-foreground/55">Oferta:</span> {a.planoNome} ·{' '}
                                  {a.periodicidade || 'recorrente'}
                                </div>
                              </div>
                              <div className="on-num text-[13.5px] font-semibold text-muted-foreground">{brl(a.precoCentavos / 100)}</div>
                              <button
                                onClick={() => setExpandedAss(expanded ? null : a.id)}
                                title="Ver períodos e faturas"
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/25"
                              >
                                <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                            {/* barra de status só durante o processo de contratação */}
                            {(sStatus === 'aguardando_assinatura' || sStatus === 'aguardando_pagamento') && (
                              <div className="mt-3">
                                <StatusStepper {...assinaturaStepper(a)} />
                              </div>
                            )}
                            <div className="mt-2 on-num text-[11px] text-muted-foreground/70">
                              Ciclo atual: {a.dataInicio ? new Date(a.dataInicio).toLocaleDateString('pt-BR') : '—'} →{' '}
                              {a.proximoVencimento ? new Date(a.proximoVencimento).toLocaleDateString('pt-BR') : '—'}
                            </div>
                          </div>

                          {!cancelada && (
                            <div className="flex flex-wrap gap-1.5 border-t border-white/[0.05] px-4 py-2.5">
                              {(sStatus === 'aguardando_assinatura' || sStatus === 'aguardando_pagamento') && (
                                <button
                                  onClick={() => setEnviarContratoOpen(true)}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-400/10 px-2.5 py-1.5 text-[12px] font-medium text-indigo-200 transition-colors hover:bg-indigo-400/20"
                                >
                                  <Send className="h-3.5 w-3.5" /> Enviar contrato
                                </button>
                              )}
                              {sStatus === 'aguardando_assinatura' && (
                                <button
                                  onClick={() => setContratoTarget(a)}
                                  title="Anexar o contrato assinado — avança para a etapa de pagamento"
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-400/10 px-2.5 py-1.5 text-[12px] font-semibold text-indigo-200 transition-colors hover:bg-indigo-400/20"
                                >
                                  <FileSignature className="h-3.5 w-3.5" /> Registrar contrato
                                </button>
                              )}
                              {(sStatus === 'aguardando_assinatura' || sStatus === 'aguardando_pagamento') && (
                                <button
                                  onClick={() => cobrarAssinatura(a, 'cobrar')}
                                  title="Emitir uma fatura (cobrança) para esta assinatura"
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-on-lime/30 bg-on-lime/10 px-2.5 py-1.5 text-[12px] font-semibold text-on-lime transition-colors hover:bg-on-lime/20"
                                >
                                  <CreditCard className="h-3.5 w-3.5" /> Emitir cobrança
                                </button>
                              )}
                              {sStatus === 'vigente' && (
                                <button
                                  onClick={() => cobrarAssinatura(a, 'antecipada')}
                                  title="Renovar antecipadamente — alonga a assinatura por mais um período e emite a fatura"
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-on-lime/30 bg-on-lime/10 px-2.5 py-1.5 text-[12px] font-semibold text-on-lime transition-colors hover:bg-on-lime/20"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" /> Renovação antecipada
                                </button>
                              )}
                              {sStatus === 'em_atraso' && (
                                <button
                                  onClick={() => cobrarAssinatura(a, 'renovar')}
                                  title="Renovar a assinatura e emitir a fatura"
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-on-lime/30 bg-on-lime/10 px-2.5 py-1.5 text-[12px] font-semibold text-on-lime transition-colors hover:bg-on-lime/20"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" /> Renovar
                                </button>
                              )}
                              {sStatus !== 'aguardando_assinatura' &&
                                sStatus !== 'aguardando_pagamento' &&
                                (suspensa ? (
                                  <button
                                    onClick={() => setAcaoTarget({ assinatura: a, acao: 'reativar' })}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:border-white/25"
                                  >
                                    <Play className="h-3.5 w-3.5" /> Reativar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setAcaoTarget({ assinatura: a, acao: 'suspender' })}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/25 px-2.5 py-1.5 text-[12px] font-medium text-amber-300 transition-colors hover:border-amber-400/50 hover:bg-amber-400/10"
                                  >
                                    <Pause className="h-3.5 w-3.5" /> Suspender
                                  </button>
                                ))}
                              <button
                                onClick={() => setAcaoTarget({ assinatura: a, acao: 'cancelar' })}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/25 px-2.5 py-1.5 text-[12px] font-medium text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10"
                              >
                                <Ban className="h-3.5 w-3.5" /> Cancelar
                              </button>
                            </div>
                          )}

                          {expanded && (
                            <div className="border-t border-white/[0.05] px-4 py-3">
                              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                                <Receipt className="h-3.5 w-3.5" /> Faturas
                              </div>
                              {periodos.length === 0 ? (
                                <div className="py-3 text-center text-[12px] text-muted-foreground/60">
                                  Nenhuma fatura emitida ainda. Use "Emitir cobrança".
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1.5">
                                  {periodos.map((p) => (
                                    <button
                                      key={p.faturaId}
                                      onClick={() =>
                                        setFaturaTarget({
                                          assinatura: a,
                                          fatura: {
                                            id: p.faturaId,
                                            codigo: codigoFatura(p.faturaId, a.produtoNome, p.criadaEm),
                                            periodoLabel: `${fmtDate(p.inicio)} → ${fmtDate(p.fim)}`,
                                            valorCentavos: p.valorCentavos,
                                            vencimento: p.vencimento,
                                            status: p.status,
                                          },
                                        })
                                      }
                                      title="Gerenciar fatura"
                                      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-2.5 py-2.5 text-left transition-colors hover:border-white/20 ${
                                        p.atual ? 'border-on-lime/20 bg-on-lime/[0.04]' : 'border-white/[0.05]'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="on-num text-[11px] font-semibold text-muted-foreground/70">
                                            {codigoFatura(p.faturaId, a.produtoNome, p.criadaEm)}
                                          </span>
                                          {p.atual && (
                                            <span className="on-pill bg-on-lime/15 text-[10px] text-on-lime">Ciclo atual</span>
                                          )}
                                        </div>
                                        <div className="mt-0.5 on-num text-[12.5px] font-medium">
                                          {fmtDate(p.inicio)} → {fmtDate(p.fim)}
                                        </div>
                                        <div className="on-num mt-0.5 text-[10.5px] text-muted-foreground/60">
                                          vence {fmtDate(p.vencimento)}
                                        </div>
                                        {p.pagaEm && (
                                          <div className="mt-0.5 text-[10.5px] text-muted-foreground/70">pago {fmtDate(p.pagaEm)}</div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-right">
                                          <div className="on-num text-[13px] font-semibold">{brlCentavos(p.valorCentavos)}</div>
                                          <span className={`on-pill mt-1 text-[10.5px] ${faturaPill(p.status)}`}>{p.status}</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                              {pinned.length > 0 && (
                                <div className="mt-3 border-t border-white/[0.05] pt-3">
                                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                                    <FileText className="h-3.5 w-3.5" /> Documentos da assinatura
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    {pinned.map((d) => (
                                      <div
                                        key={d.id}
                                        className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2"
                                      >
                                        <a
                                          href={d.arquivo_url ?? '#'}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex min-w-0 flex-1 items-center gap-2 transition-colors hover:text-on-lime"
                                        >
                                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                          <span className="min-w-0 flex-1 truncate text-[12.5px]">{d.nome_documento}</span>
                                          <span className="shrink-0 text-[10.5px] text-muted-foreground/70">{d.tipo}</span>
                                          <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDocExcluir({
                                              assinatura: a,
                                              doc: { id: d.id, nome: d.nome_documento, tipo: d.tipo, arquivoUrl: d.arquivo_url },
                                            })
                                          }
                                          title="Excluir documento (exige senha)"
                                          className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-red-300"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {ehEnderecoFiscal(a.produtoNome) && (
                                <EnderecoFiscalDocs userId={client.user_id} clientName={client.name} />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Avulsos — histórico de pedidos (mais recente → mais antigo) */}
                <div className="mb-2 text-[11.5px] font-semibold text-muted-foreground/80">Avulsos (histórico de pedidos)</div>
                {comercio.avulsos.length === 0 ? (
                  <div className="mb-6 rounded-xl border border-dashed border-white/[0.1] px-4 py-4 text-center text-[12.5px] text-muted-foreground/60">
                    Nenhum produto avulso.
                  </div>
                ) : (
                  <div className="mb-6 flex flex-col gap-2">
                    {comercio.avulsos.map((v) => (
                      <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0e0e11] px-4 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-400/15 text-indigo-300">
                          <ShoppingCart className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-semibold">{v.descricao || v.produtoNome}</div>
                          <div className="mt-0.5 text-[11.5px] text-muted-foreground/80">
                            {v.quantidade} {v.unidade || 'un'}
                            {v.dataPedido ? ` · ${new Date(v.dataPedido).toLocaleDateString('pt-BR')}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="on-num text-[13.5px] font-semibold text-muted-foreground">
                            {brlCentavos(v.precoUnitCentavos * v.quantidade)}
                          </div>
                          <span
                            className={`on-pill mt-1 text-[10.5px] ${
                              v.pedidoStatus === 'pago'
                                ? 'bg-on-lime/15 text-on-lime'
                                : v.pedidoStatus === 'cancelado'
                                ? 'bg-red-500/15 text-red-300'
                                : 'bg-orange-400/15 text-orange-300'
                            }`}
                          >
                            {v.pedidoStatus}
                          </span>
                        </div>
                        {v.pedidoStatus === 'aberto' && (
                          <button
                            onClick={() => cobrarPedido(v)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-on-lime/30 bg-on-lime/10 px-2.5 py-1.5 text-[12px] font-semibold text-on-lime transition-colors hover:bg-on-lime/20"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Cobrar pedido
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0e0e11] px-4 py-3">
                  <span className="text-[12.5px] text-muted-foreground">Total a receber (faturas em aberto/vencidas)</span>
                  <span className="on-num text-lg font-semibold text-orange-300">
                    {brlCentavos(
                      comercio.assinaturas
                        .flatMap((a) => a.faturas)
                        .filter((f) => f.status === 'aberta' || f.status === 'vencida')
                        .reduce((s, f) => s + f.valorCentavos, 0),
                    )}
                  </span>
                </div>
              </div>
            )}

            {tab === 'correspondencias' && (
              <div>
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                    Correspondências recebidas
                  </span>
                  <button
                    onClick={() => setCorrOpen(true)}
                    disabled={!client.user_id}
                    title={client.user_id ? 'Registrar correspondência recebida' : 'Cliente sem acesso provisionado'}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-[13px] w-[13px]" /> Registrar correspondência
                  </button>
                </div>
                {ficha.loading ? (
                  <div className="py-6 text-center text-[13px] text-muted-foreground/60">Carregando…</div>
                ) : ficha.correspondencias.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-muted-foreground/60">
                    Nenhuma correspondência registrada.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {ficha.correspondencias.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#0e0e11] px-4 py-3"
                      >
                        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-muted-foreground">
                          <Mail className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13.5px] font-semibold">{m.assunto}</span>
                            <span className="rounded-full bg-white/[0.06] px-2 py-px text-[10px] font-semibold text-muted-foreground">
                              {m.categoria}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[12px] text-muted-foreground/80">
                            De: {m.remetente} · {fmtDate(m.data_recebimento)}
                          </div>
                        </div>
                        <span
                          className={`on-pill text-[10.5px] ${
                            m.visualizada ? 'bg-white/[0.06] text-muted-foreground' : 'bg-on-lime text-on-black'
                          }`}
                        >
                          {m.visualizada ? 'Visualizada' : 'Nova'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'documentos' && (
              <div>
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Documentos</span>
                  <button
                    onClick={() => setAnexarOpen(true)}
                    disabled={!client.user_id}
                    title={client.user_id ? 'Anexar documento ao cliente' : 'Cliente sem acesso provisionado'}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-[13px] w-[13px]" /> Anexar documento
                  </button>
                </div>
                {client.contrato_assinado_url && (
                  <button
                    onClick={() =>
                      abrirContratoAssinado(client.contrato_assinado_url!).catch(() =>
                        toast({
                          title: 'Não foi possível abrir o contrato',
                          description: 'Verifique se o bucket de contratos foi criado pela migração.',
                          variant: 'destructive',
                        }),
                      )
                    }
                    className="mb-2.5 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-indigo-400/30 bg-indigo-400/10 px-4 py-3 text-left transition-colors hover:bg-indigo-400/15"
                  >
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-indigo-400/15 text-indigo-200">
                      <FileSignature className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold">Contrato assinado.pdf</div>
                      <div className="mt-0.5 text-[11.5px] text-indigo-200/70">Anexado manualmente</div>
                    </div>
                    <Download className="h-[17px] w-[17px] text-muted-foreground" />
                  </button>
                )}
                {ficha.loading ? (
                  <div className="py-6 text-center text-[13px] text-muted-foreground/60">Carregando…</div>
                ) : ficha.documentos.length === 0 && !client.contrato_assinado_url ? (
                  <div className="py-6 text-center text-[13px] text-muted-foreground/60">
                    Nenhum documento registrado.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {ficha.documentos.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0e0e11] px-4 py-3"
                      >
                        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-muted-foreground">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-semibold">{d.nome_documento}</div>
                          <div className="mt-0.5 text-[11.5px] text-muted-foreground/80">
                            {d.tipo} · {fmtDate(d.data)}
                          </div>
                        </div>
                        {d.arquivo_url && (
                          <a href={d.arquivo_url} target="_blank" rel="noreferrer" className="cursor-pointer text-muted-foreground hover:text-foreground">
                            <Download className="h-[17px] w-[17px]" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'atividades' && (
              <div>
                <SectionTitle>Histórico de atividades</SectionTitle>
                {ficha.loading ? (
                  <div className="py-6 text-center text-[13px] text-muted-foreground/60">Carregando…</div>
                ) : ficha.atividades.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-muted-foreground/60">
                    Nenhuma atividade registrada para este cliente.
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {ficha.atividades.map((a, i) => {
                      const last = i === ficha.atividades.length - 1;
                      return (
                        <div key={a.id} className="flex gap-3.5">
                          <div className="flex flex-col items-center">
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-400 shadow-[0_0_0_3px_rgba(129,140,248,0.13)]" />
                            {!last && <span className="my-0.5 w-0.5 flex-1 bg-white/[0.08]" />}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="text-[13.5px] font-semibold">{humanizarAcao(a.acao)}</div>
                            <div className="mt-0.5 text-[12.5px] text-muted-foreground">{a.descricao}</div>
                            <div className="on-num mt-1 text-[11px] text-muted-foreground/60">
                              {new Date(a.data_atividade).toLocaleString('pt-BR')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <VenderProdutoModal
        isOpen={vendaOpen}
        onClose={() => setVendaOpen(false)}
        client={client}
        onDone={() => {
          comercio.refetch();
          onSaved();
        }}
      />
      <EnviarContratoModal
        isOpen={enviarContratoOpen}
        onClose={() => setEnviarContratoOpen(false)}
        client={client}
        onDone={onSaved}
      />
      <AssinaturaAcaoModal
        isOpen={!!acaoTarget}
        onClose={() => setAcaoTarget(null)}
        clienteId={client.id}
        userId={client.user_id}
        assinatura={acaoTarget?.assinatura ?? null}
        acao={acaoTarget?.acao ?? 'renovar'}
        onDone={() => comercio.refetch()}
      />
      <RegistrarContratoAssinaturaModal
        isOpen={!!contratoTarget}
        onClose={() => setContratoTarget(null)}
        userId={client.user_id}
        assinatura={contratoTarget}
        onDone={() => comercio.refetch()}
      />
      <EmitirCobrancaModal
        isOpen={!!cobrancaAlvo}
        onClose={() => setCobrancaAlvo(null)}
        clienteId={client.id}
        userId={client.user_id}
        alvo={cobrancaAlvo}
        onDone={() => comercio.refetch()}
      />
      <FaturaModal
        isOpen={!!faturaTarget}
        onClose={() => setFaturaTarget(null)}
        fatura={faturaTarget?.fatura ?? null}
        assinatura={faturaTarget?.assinatura ?? null}
        userId={client.user_id}
        onDone={() => comercio.refetch()}
      />
      <ExcluirDocAssinaturaModal
        isOpen={!!docExcluir}
        onClose={() => setDocExcluir(null)}
        doc={docExcluir?.doc ?? null}
        assinatura={docExcluir?.assinatura ?? null}
        userId={client.user_id}
        onDone={() => comercio.refetch()}
      />
      <NewCorrespondenceModal
        isOpen={corrOpen}
        onClose={() => setCorrOpen(false)}
        onSuccess={() => setCorrOpen(false)}
        lockedUserId={client.user_id}
        lockedClientName={client.name}
      />
      <AnexarDocumentoModal
        isOpen={anexarOpen}
        onClose={() => setAnexarOpen(false)}
        userId={client.user_id}
        clientName={client.name}
        onDone={() => undefined}
      />
    </div>
  );
};

export default ClienteFicha;
