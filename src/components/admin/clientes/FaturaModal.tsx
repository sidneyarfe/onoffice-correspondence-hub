import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Bell, Ban, CalendarClock, Check, CreditCard, FileText, History, Mail, Package, Receipt, Upload, User, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { registrarAtividade } from '@/utils/atividade';
import { notificarCliente } from '@/utils/notificacao';
import { pinDescricao } from './docPin';
import { brlCentavos } from './clientesShared';
import type { AssinaturaItem } from '@/hooks/useClienteComercio';

const DOC_BUCKET = 'documentos_fiscais';
const sanitize = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]+/g, '_');

export interface FaturaGerencia {
  id: string;
  codigo: string;
  periodoLabel: string;
  valorCentavos: number;
  vencimento: string | null;
  status: string; // aberta | paga | vencida | cancelada
  /** nome do produto cobrado — usado quando a fatura é aberta fora da ficha (sem `assinatura`) */
  produtoNome?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fatura: FaturaGerencia | null;
  assinatura: AssinaturaItem | null;
  /** cliente relacionado à fatura — exibido explicitamente no topo do modal */
  cliente?: { nome: string; email?: string | null } | null;
  userId?: string | null;
  onDone: () => void;
}

const statusPill = (status: string) =>
  status === 'paga'
    ? 'bg-on-lime/15 text-on-lime'
    : status === 'vencida'
    ? 'bg-red-500/15 text-red-300'
    : status === 'cancelada'
    ? 'bg-white/[0.07] text-muted-foreground'
    : 'bg-orange-400/15 text-orange-300';

const FaturaModal: React.FC<Props> = ({ isOpen, onClose, fatura, assinatura, cliente, userId, onDone }) => {
  const { toast } = useToast();
  const [venc, setVenc] = useState('');
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [notifInterna, setNotifInterna] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [busy, setBusy] = useState<null | 'pagar' | 'venc' | 'cancelar' | 'notif'>(null);
  const [historico, setHistorico] = useState<{ id: string; descricao: string; data: string }[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isOpen && fatura) {
      setVenc(fatura.vencimento ? new Date(fatura.vencimento).toISOString().slice(0, 10) : '');
      setComprovante(null);
      setNotifInterna(true);
      setNotifEmail(false);
      setBusy(null);
    }
  }, [isOpen, fatura]);

  // histórico de notificações enviadas desta fatura (registrado no log de atividades)
  useEffect(() => {
    if (!isOpen || !fatura || !userId) {
      setHistorico([]);
      return;
    }
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from('atividades_cliente')
        .select('id, descricao, data_atividade')
        .eq('user_id', userId)
        .eq('acao', 'fatura_notificada')
        .ilike('descricao', `%${fatura.codigo}%`)
        .order('data_atividade', { ascending: false })
        .limit(20);
      if (!cancel) {
        setHistorico(
          ((data ?? []) as Array<{ id: string; descricao: string; data_atividade: string }>).map((d) => ({
            id: d.id,
            descricao: d.descricao,
            data: d.data_atividade,
          })),
        );
      }
    })();
    return () => {
      cancel = true;
    };
  }, [isOpen, fatura, userId, tick]);

  if (!fatura) return null;

  const aberta = fatura.status === 'aberta' || fatura.status === 'vencida';
  const nomeAss = assinatura ? `${assinatura.produtoNome ? `${assinatura.produtoNome} — ` : ''}${assinatura.planoNome}` : '';
  const produtoLabel = nomeAss || fatura.produtoNome || '—';

  const registrarPagamento = async () => {
    if (!userId) {
      toast({ title: 'Cliente sem acesso', description: 'Provisione o usuário do cliente.', variant: 'destructive' });
      return;
    }
    if (!comprovante) {
      toast({ title: 'Comprovante obrigatório', description: 'Anexe o comprovante do pagamento.', variant: 'destructive' });
      return;
    }
    setBusy('pagar');
    try {
      const path = `cliente/${userId}/comprovante-${Date.now()}-${sanitize(comprovante.name)}`;
      const { error: upErr } = await supabase.storage.from(DOC_BUCKET).upload(path, comprovante, { upsert: true, contentType: comprovante.type || 'application/octet-stream' });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(DOC_BUCKET).getPublicUrl(path);

      const { error: docErr } = await supabase.from('documentos_cliente').insert({
        user_id: userId,
        nome_documento: `Comprovante ${fatura.codigo}`,
        tipo: 'Comprovante de pagamento',
        descricao: assinatura ? pinDescricao(assinatura.id, nomeAss) : null,
        arquivo_url: urlData.publicUrl,
        data_emissao: new Date().toISOString().slice(0, 10),
        tamanho_kb: Math.max(1, Math.round(comprovante.size / 1024)),
      } as never);
      if (docErr) throw docErr;

      const { error: payErr } = await supabase
        .from('pagamentos')
        .update({ status: 'confirmado', data_pagamento: new Date().toISOString(), updated_at: new Date().toISOString() } as never)
        .eq('id', fatura.id);
      if (payErr) throw payErr;

      if (assinatura && assinatura.status === 'aguardando_pagamento') {
        const { error: assErr } = await supabase
          .from('assinaturas')
          .update({ status: 'ativo', updated_at: new Date().toISOString() } as never)
          .eq('id', assinatura.id);
        if (assErr) throw assErr;
      }

      await registrarAtividade(userId, 'pagamento_registrado', `Pagamento da fatura ${fatura.codigo} (${brlCentavos(fatura.valorCentavos)}) registrado (admin)`);
      toast({ title: 'Pagamento registrado', description: 'A fatura foi marcada como paga.' });
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao registrar pagamento', description: err instanceof Error ? err.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const salvarVencimento = async () => {
    if (!venc) return;
    setBusy('venc');
    try {
      const { error } = await supabase.from('pagamentos').update({ data_vencimento: venc, updated_at: new Date().toISOString() } as never).eq('id', fatura.id);
      if (error) throw error;
      await registrarAtividade(userId, 'fatura_alterada', `Vencimento da fatura ${fatura.codigo} alterado para ${new Date(venc).toLocaleDateString('pt-BR')} (admin)`);
      toast({ title: 'Vencimento atualizado', description: `Fatura ${fatura.codigo}.` });
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao alterar vencimento', description: err instanceof Error ? err.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const cancelarFatura = async () => {
    setBusy('cancelar');
    try {
      const { error } = await supabase.from('pagamentos').update({ status: 'cancelado', updated_at: new Date().toISOString() } as never).eq('id', fatura.id);
      if (error) throw error;
      await registrarAtividade(userId, 'fatura_cancelada', `Fatura ${fatura.codigo} cancelada (admin)`);
      toast({ title: 'Fatura cancelada', description: `${fatura.codigo}.` });
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao cancelar fatura', description: err instanceof Error ? err.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const reenviarNotificacao = async () => {
    if (!notifInterna && !notifEmail) {
      toast({ title: 'Selecione um canal', description: 'Marque notificação na plataforma e/ou e-mail.', variant: 'destructive' });
      return;
    }
    setBusy('notif');
    try {
      await notificarCliente(
        userId,
        `Fatura ${fatura.codigo} — ON Office`,
        `Lembrete da fatura ${fatura.codigo} (${brlCentavos(fatura.valorCentavos)}), vencimento ${fatura.vencimento ? new Date(fatura.vencimento).toLocaleDateString('pt-BR') : '—'}.`,
        { interna: notifInterna, email: notifEmail },
      );
      const canais = [notifInterna ? 'plataforma' : null, notifEmail ? 'e-mail' : null].filter(Boolean).join(' + ');
      await registrarAtividade(userId, 'fatura_notificada', `Notificação da fatura ${fatura.codigo} enviada via ${canais} (admin)`);
      toast({ title: 'Notificação enviada', description: `Fatura ${fatura.codigo}.` });
      setTick((t) => t + 1);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao notificar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const inputCls = 'on-num h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50';

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-[500px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-6 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-on-lime/10 text-on-lime">
            <Receipt className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="on-num text-lg font-bold">{fatura.codigo}</h2>
              <span className={`on-pill text-[10.5px] ${statusPill(fatura.status)}`}>{fatura.status}</span>
            </div>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{nomeAss || 'Fatura'}</p>
          </div>
          <div className="on-num text-base font-bold text-on-lime">{brlCentavos(fatura.valorCentavos)}</div>
        </div>

        <div className="max-h-[62vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Dados da fatura — cliente, produto, período cobrado e vencimento (explícitos) */}
          <section className="grid grid-cols-2 gap-3 text-[12.5px]">
            {cliente && (
              <div className="col-span-2 flex items-start gap-2">
                <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground/70">Cliente relacionado</div>
                  <div className="truncate font-medium leading-snug">{cliente.nome}</div>
                  {cliente.email && <div className="on-num truncate text-[11px] text-muted-foreground/70">{cliente.email}</div>}
                </div>
              </div>
            )}
            <div className="col-span-2 flex items-start gap-2">
              <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground/70">Produto cobrado</div>
                <div className="font-medium leading-snug">{produtoLabel}</div>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground/70">Período cobrado</div>
              <div className="on-num font-medium">{fatura.periodoLabel}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground/70">Vencimento do pagamento</div>
              <div className="on-num font-medium">
                {fatura.vencimento ? new Date(fatura.vencimento).toLocaleDateString('pt-BR') : '—'}
              </div>
            </div>
          </section>

          {/* Registrar pagamento (faturas em aberto) */}
          {aberta && (
            <section className="border-t border-white/[0.06] pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                <CreditCard className="h-3.5 w-3.5" /> Registrar pagamento
              </div>
              <label
                className={`mb-2.5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                  comprovante ? 'border-on-lime/40 bg-on-lime/[0.05]' : 'border-white/12 hover:border-white/25'
                }`}
              >
                {comprovante ? (
                  <>
                    <FileText className="h-5 w-5 text-on-lime" />
                    <div className="mt-1.5 text-[12.5px] font-semibold">{comprovante.name}</div>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <div className="mt-1.5 text-[12.5px] font-semibold">Anexar comprovante</div>
                  </>
                )}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (f && f.size > 10 * 1024 * 1024) {
                      toast({ title: 'Arquivo muito grande', description: 'Máximo 10MB.', variant: 'destructive' });
                      return;
                    }
                    setComprovante(f);
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={registrarPagamento}
                disabled={busy !== null || !comprovante}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-on-lime px-4 py-2.5 text-[13px] font-bold text-on-black transition-shadow hover:shadow-[0_0_18px_rgba(96,255,0,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> {busy === 'pagar' ? 'Registrando…' : 'Marcar como paga'}
              </button>
            </section>
          )}

          {/* Alterar vencimento */}
          {fatura.status !== 'cancelada' && (
            <section className="border-t border-white/[0.06] pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                <CalendarClock className="h-3.5 w-3.5" /> Alterar vencimento
              </div>
              <div className="flex gap-2">
                <input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} className={inputCls} />
                <button
                  type="button"
                  onClick={salvarVencimento}
                  disabled={busy !== null || !venc}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 text-[13px] font-medium transition-colors hover:border-white/25 disabled:opacity-50"
                >
                  {busy === 'venc' ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </section>
          )}

          {/* Reenviar notificação */}
          {fatura.status !== 'cancelada' && (
            <section className="border-t border-white/[0.06] pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                <Bell className="h-3.5 w-3.5" /> Reenviar notificação
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[13px]">
                <input type="checkbox" checked={notifInterna} onChange={(e) => setNotifInterna(e.target.checked)} className="h-4 w-4 accent-on-lime" />
                <Bell className="h-4 w-4 text-muted-foreground" /> Notificação na plataforma
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[13px]">
                <input type="checkbox" checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} className="h-4 w-4 accent-on-lime" />
                <Mail className="h-4 w-4 text-muted-foreground" /> Enviar por e-mail
              </label>
              <button
                type="button"
                onClick={reenviarNotificacao}
                disabled={busy !== null}
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2 text-[13px] font-medium transition-colors hover:border-white/25 disabled:opacity-50"
              >
                <Mail className="h-3.5 w-3.5" /> {busy === 'notif' ? 'Enviando…' : 'Reenviar'}
              </button>
            </section>
          )}

          {/* Histórico de notificações desta fatura (registrado no log de atividades) */}
          <section className="border-t border-white/[0.06] pt-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
              <History className="h-3.5 w-3.5" /> Histórico de notificações
            </div>
            {historico.length === 0 ? (
              <div className="text-[12px] text-muted-foreground/60">Nenhuma notificação enviada para esta fatura.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {historico.map((h) => (
                  <div key={h.id} className="rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2">
                    <div className="text-[12px] leading-snug text-foreground/90">{h.descricao}</div>
                    <div className="on-num mt-0.5 text-[10.5px] text-muted-foreground/60">{new Date(h.data).toLocaleString('pt-BR')}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {fatura.status === 'cancelada' && (
            <div className="rounded-[11px] border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-[12px] text-muted-foreground">
              Fatura cancelada — somente leitura.
            </div>
          )}

          {/* Cancelar fatura */}
          {fatura.status !== 'cancelada' && fatura.status !== 'paga' && (
            <section className="border-t border-white/[0.06] pt-4">
              <button
                type="button"
                onClick={cancelarFatura}
                disabled={busy !== null}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-red-500/25 px-4 py-2 text-[13px] font-medium text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-50"
              >
                <Ban className="h-3.5 w-3.5" /> {busy === 'cancelar' ? 'Cancelando…' : 'Cancelar fatura'}
              </button>
            </section>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] px-6 py-4">
          <button type="button" onClick={onClose} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25">
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FaturaModal;
