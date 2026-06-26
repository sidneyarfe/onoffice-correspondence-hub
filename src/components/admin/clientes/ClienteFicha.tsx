import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  User,
  Pencil,
  CreditCard,
  FileSignature,
  Check,
  Mail,
  FileText,
  Download,
  Package,
  Trash2,
} from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import { useClienteFicha } from '@/hooks/useClienteFicha';
import {
  StatusPill,
  TypePill,
  ClientAvatar,
  brl,
  mensalidadeReais,
  buildTimeline,
  docDe,
  isPJ,
  StepState,
} from './clientesShared';
import { abrirContratoAssinado } from './clientesStorage';
import { useToast } from '@/hooks/use-toast';

type FichaTab = 'cadastro' | 'financeiro' | 'correspondencias' | 'documentos' | 'atividades';

interface ClienteFichaProps {
  client: AdminClient;
  onBack: () => void;
  onEdit: () => void;
  onCobrar: () => void;
  onRegistrarContrato: () => void;
  onPerfil: () => void;
  onExcluir: () => void;
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

const payStatusPill = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'pago' || s === 'paid' || s === 'confirmado')
    return 'bg-on-lime/15 text-on-lime';
  if (s === 'pendente' || s === 'pending' || s === 'a vencer') return 'bg-orange-400/15 text-orange-300';
  return 'bg-white/[0.07] text-muted-foreground';
};

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
};

const ClienteFicha: React.FC<ClienteFichaProps> = ({
  client,
  onBack,
  onEdit,
  onCobrar,
  onRegistrarContrato,
  onPerfil,
  onExcluir,
}) => {
  const [tab, setTab] = useState<FichaTab>('cadastro');
  const { toast } = useToast();
  const ficha = useClienteFicha(client.id, client.user_id);
  const canAssinar = ['iniciado', 'contrato_enviado'].includes(client.status);
  const timeline = useMemo(() => buildTimeline(client.status), [client.status]);

  const totalPago = useMemo(
    () =>
      ficha.pagamentos
        .filter((p) => ['pago', 'paid', 'confirmado'].includes(p.status.toLowerCase()))
        .reduce((sum, p) => sum + p.valor, 0),
    [ficha.pagamentos],
  );
  const ultimoPagamento = useMemo(() => {
    const pagos = ficha.pagamentos
      .filter((p) => p.data_pagamento)
      .sort((a, b) => new Date(b.data_pagamento!).getTime() - new Date(a.data_pagamento!).getTime());
    return pagos[0]?.data_pagamento ?? null;
  }, [ficha.pagamentos]);

  const tabs: { key: FichaTab; label: string }[] = [
    { key: 'cadastro', label: 'Cadastro' },
    { key: 'financeiro', label: 'Plano & Financeiro' },
    { key: 'correspondencias', label: `Correspondências${client.correspondences ? ` · ${client.correspondences}` : ''}` },
    { key: 'documentos', label: 'Documentos' },
    { key: 'atividades', label: 'Atividades' },
  ];

  const dotClass = (state: StepState) =>
    state === 'done'
      ? 'bg-on-lime/15 text-on-lime'
      : state === 'current'
      ? 'bg-indigo-400/20 text-indigo-200 ring-2 ring-indigo-400/20'
      : state === 'terminal'
      ? ''
      : 'bg-[#1b1b1f] text-transparent border border-white/10';

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para clientes
      </button>

      {/* Header card */}
      <div className="mb-4 rounded-2xl border border-white/[0.08] bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <ClientAvatar client={client} size={54} rounded="0.8rem" />
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <TypePill client={client} />
                <StatusPill status={client.status} />
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
            <button
              onClick={onPerfil}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-white/25"
            >
              <User className="h-[15px] w-[15px]" /> Perfil do cliente
            </button>
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-white/25"
            >
              <Pencil className="h-[15px] w-[15px]" /> Editar
            </button>
            <button
              onClick={onCobrar}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-white/25"
            >
              <CreditCard className="h-[15px] w-[15px]" /> Gerar cobrança
            </button>
            {canAssinar && (
              <button
                onClick={onRegistrarContrato}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/40 bg-indigo-400/15 px-3.5 py-2 text-[13px] font-semibold text-indigo-200 transition-colors hover:bg-indigo-400/25"
              >
                <FileSignature className="h-[15px] w-[15px]" /> Registrar assinatura
              </button>
            )}
            <button
              onClick={onExcluir}
              title="Excluir ou cancelar cliente"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 px-3.5 py-2 text-[13px] font-medium text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10"
            >
              <Trash2 className="h-[15px] w-[15px]" /> Excluir
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-3.5">
          <div className="rounded-2xl border border-white/[0.08] bg-card p-[18px]">
            <SectionTitle>Resumo do contrato</SectionTitle>
            <div className="flex flex-col gap-3.5">
              <Field label="Plano" value={<span className="font-semibold text-muted-foreground">{client.plan}</span>} />
              <div>
                <div className="mb-0.5 text-[11.5px] text-muted-foreground/80">Mensalidade</div>
                <div className="on-num text-base font-semibold text-on-lime">
                  {client.preco ? brl(mensalidadeReais(client)) : '—'}
                </div>
              </div>
              <div className="flex gap-6">
                <Field label="Adesão" value={client.joinDate} mono />
                <Field label="Vencimento" value={client.nextDue} mono />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-card p-[18px]">
            <SectionTitle>Situação do cliente</SectionTitle>
            <div className="flex flex-col">
              {timeline.map((step, i) => {
                const last = i === timeline.length - 1;
                return (
                  <div key={`${step.label}-${i}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${dotClass(step.state)}`}
                        style={step.state === 'terminal' ? { background: `${step.color}26`, color: step.color } : undefined}
                      >
                        {step.state === 'done' && <Check className="h-3 w-3" strokeWidth={3.4} />}
                      </span>
                      {!last && (
                        <span
                          className="my-0.5 w-0.5 flex-1"
                          style={{
                            minHeight: 14,
                            background: step.state === 'done' ? 'rgba(96,255,0,.35)' : 'rgba(255,255,255,.08)',
                          }}
                        />
                      )}
                    </div>
                    <div className="pb-3.5">
                      <div
                        className="text-[13px] font-semibold"
                        style={{
                          color:
                            step.state === 'done'
                              ? '#dfe1e6'
                              : step.state === 'current'
                              ? '#c3cafc'
                              : step.state === 'terminal'
                              ? step.color
                              : '#7d808b',
                          fontWeight: step.state === 'current' || step.state === 'terminal' ? 700 : 600,
                        }}
                      >
                        {step.label}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground/70">{step.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column — tabs */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
          <div className="flex gap-0.5 overflow-x-auto border-b border-white/[0.06] p-1.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  tab === t.key ? 'bg-on-lime/15 text-on-lime' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'cadastro' && (
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
                  <SectionTitle>Endereço fiscal contratado</SectionTitle>
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
            )}

            {tab === 'financeiro' && (
              <div>
                <div className="mb-3.5 flex items-center justify-between gap-3">
                  <SectionTitle>Planos e produtos contratados</SectionTitle>
                  <button
                    onClick={onCobrar}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-on-lime/30 bg-on-lime/15 px-3 py-1.5 text-[12.5px] font-semibold text-on-lime transition-colors hover:bg-on-lime/25"
                  >
                    <CreditCard className="h-[13px] w-[13px]" /> Gerar cobrança
                  </button>
                </div>
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0e0e11] px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-on-lime/10 text-on-lime">
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold">{client.plan}</div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground/80">
                      {client.periodicidade || '—'} · início {client.joinDate} · próx. {client.nextDue}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="on-num text-[13.5px] font-semibold text-muted-foreground">
                      {client.preco ? brl(mensalidadeReais(client)) : '—'}
                    </div>
                    <StatusPill status={client.status} short className="mt-1" />
                  </div>
                </div>

                <div className="mb-5 flex flex-wrap gap-3">
                  <div className="min-w-[130px] flex-1 rounded-xl border border-white/[0.06] bg-[#0e0e11] p-3.5">
                    <div className="mb-1 text-[11.5px] text-muted-foreground/80">Total pago</div>
                    <div className="on-num text-lg font-semibold text-on-lime">{brl(totalPago)}</div>
                  </div>
                  <div className="min-w-[130px] flex-1 rounded-xl border border-white/[0.06] bg-[#0e0e11] p-3.5">
                    <div className="mb-1 text-[11.5px] text-muted-foreground/80">Último pagamento</div>
                    <div className="on-num text-sm font-semibold">{fmtDate(ultimoPagamento)}</div>
                  </div>
                  <div className="min-w-[130px] flex-1 rounded-xl border border-white/[0.06] bg-[#0e0e11] p-3.5">
                    <div className="mb-1 text-[11.5px] text-muted-foreground/80">Próx. vencimento</div>
                    <div className="on-num text-sm font-semibold text-orange-300">{client.nextDue}</div>
                  </div>
                </div>

                <SectionTitle>Pagamentos registrados</SectionTitle>
                {ficha.loading ? (
                  <div className="py-6 text-center text-[13px] text-muted-foreground/60">Carregando…</div>
                ) : ficha.pagamentos.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-muted-foreground/60">
                    Nenhum pagamento registrado para este cliente.
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {ficha.pagamentos.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
                            <CreditCard className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <div className="on-num text-[13.5px] font-semibold">{brl(p.valor)}</div>
                            <div className="text-[11.5px] text-muted-foreground/80">
                              {p.descricao} · {fmtDate(p.data_pagamento || p.data_vencimento)}
                            </div>
                          </div>
                        </div>
                        <span className={`on-pill text-[11px] ${payStatusPill(p.status)}`}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'correspondencias' && (
              <div>
                <SectionTitle>Correspondências recebidas</SectionTitle>
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
                <SectionTitle>Documentos</SectionTitle>
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
                    className="mb-2.5 flex w-full items-center gap-3 rounded-xl border border-indigo-400/30 bg-indigo-400/10 px-4 py-3 text-left transition-colors hover:bg-indigo-400/15"
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
                          <a href={d.arquivo_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
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
                            <div className="text-[13.5px] font-semibold">{a.acao}</div>
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
    </div>
  );
};

export default ClienteFicha;
