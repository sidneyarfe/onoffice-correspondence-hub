import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, Ban, Check, Info, Lock, Pause, Play, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { reauthAdmin } from '@/utils/reauth';
import { registrarAtividade } from '@/utils/atividade';
import { brl } from './clientesShared';
import type { AssinaturaItem } from '@/hooks/useClienteComercio';

export type AssinaturaAcao = 'renovar' | 'suspender' | 'reativar' | 'cancelar';

interface AssinaturaAcaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  userId?: string | null;
  assinatura: AssinaturaItem | null;
  acao: AssinaturaAcao;
  onDone: () => void;
}

type Metodo = 'Pix' | 'Boleto' | 'Cartão';

const isoInDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// Ações que exigem reautenticação do admin (decisão do usuário). Reativar é restauração → sem senha.
const EXIGE_SENHA: Record<AssinaturaAcao, boolean> = {
  renovar: true,
  suspender: true,
  cancelar: true,
  reativar: false,
};

const META: Record<
  AssinaturaAcao,
  { titulo: string; icon: React.ReactNode; accent: string; cta: string }
> = {
  renovar: {
    titulo: 'Renovar assinatura',
    icon: <RefreshCw className="h-[18px] w-[18px]" />,
    accent: 'bg-blue-400/15 text-blue-300',
    cta: 'Renovar',
  },
  suspender: {
    titulo: 'Suspender assinatura',
    icon: <Pause className="h-[18px] w-[18px]" />,
    accent: 'bg-amber-400/15 text-amber-300',
    cta: 'Suspender',
  },
  reativar: {
    titulo: 'Reativar assinatura',
    icon: <Play className="h-[18px] w-[18px]" />,
    accent: 'bg-on-lime/10 text-on-lime',
    cta: 'Reativar',
  },
  cancelar: {
    titulo: 'Cancelar assinatura',
    icon: <Ban className="h-[18px] w-[18px]" />,
    accent: 'bg-red-500/15 text-red-300',
    cta: 'Cancelar assinatura',
  },
};

const AssinaturaAcaoModal: React.FC<AssinaturaAcaoModalProps> = ({
  isOpen,
  onClose,
  clienteId,
  userId,
  assinatura,
  acao,
  onDone,
}) => {
  const { toast } = useToast();
  const meta = META[acao];
  const exigeSenha = EXIGE_SENHA[acao];

  // estado da renovação
  const [metodo, setMetodo] = useState<Metodo>('Pix');
  const [due, setDue] = useState(isoInDays(7));
  const [valor, setValor] = useState('0');

  // gate de senha + envio
  const [senha, setSenha] = useState('');
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen && assinatura) {
      setMetodo('Pix');
      setDue(isoInDays(7));
      setValor((assinatura.precoCentavos / 100).toFixed(2));
      setSenha('');
      setErroSenha(null);
      setBusy(false);
    }
  }, [isOpen, assinatura]);

  const valorCentavos = useMemo(() => Math.round((parseFloat(valor.replace(',', '.')) || 0) * 100), [valor]);

  if (!assinatura) return null;

  const podeConfirmar =
    !busy && (!exigeSenha || senha.trim().length > 0) && (acao !== 'renovar' || valorCentavos > 0);

  const executar = async () => {
    if (acao === 'renovar') {
      const descricao = `Renovação: ${assinatura.produtoNome ? `${assinatura.produtoNome} — ` : ''}${assinatura.planoNome}`;
      const { error } = await supabase.from('pagamentos').insert({
        contratacao_id: clienteId,
        cliente_plano_id: assinatura.id,
        user_id: userId ?? null,
        valor: valorCentavos / 100,
        valor_centavos: valorCentavos,
        data_vencimento: due,
        descricao,
        status: 'pendente',
      } as never);
      if (error) throw error;
      return;
    }
    const status = acao === 'cancelar' ? 'cancelado' : acao === 'suspender' ? 'suspenso' : 'ativo';
    const { error } = await supabase
      .from('assinaturas')
      .update({ status, updated_at: new Date().toISOString() } as never)
      .eq('id', assinatura.id);
    if (error) throw error;
  };

  const handleConfirm = async () => {
    if (acao === 'renovar' && !userId) {
      toast({
        title: 'Cliente sem acesso provisionado',
        description: 'Só é possível registrar fatura após o cliente ter usuário criado.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    setErroSenha(null);
    try {
      if (exigeSenha) {
        await reauthAdmin(senha); // valida a senha do admin logado
      }
    } catch (err) {
      setErroSenha(err instanceof Error ? err.message : 'Não foi possível confirmar a senha.');
      setBusy(false);
      return;
    }
    try {
      await executar();
      const nomeAss = `${assinatura.produtoNome ? `${assinatura.produtoNome} — ` : ''}${assinatura.planoNome}`;
      const acaoLog =
        acao === 'renovar'
          ? 'assinatura_renovada'
          : acao === 'cancelar'
          ? 'assinatura_cancelada'
          : acao === 'suspender'
          ? 'assinatura_suspensa'
          : 'assinatura_reativada';
      registrarAtividade(
        userId,
        acaoLog,
        acao === 'renovar' ? `Renovação gerada (${brl(valorCentavos / 100)}) — ${nomeAss} (admin)` : `${meta.cta} — ${nomeAss} (admin)`,
      );
      toast({
        title:
          acao === 'renovar'
            ? 'Renovação gerada'
            : acao === 'cancelar'
            ? 'Assinatura cancelada'
            : acao === 'suspender'
            ? 'Assinatura suspensa'
            : 'Assinatura reativada',
        description:
          acao === 'renovar'
            ? `Fatura de ${brl(valorCentavos / 100)} registrada para esta assinatura.`
            : `${assinatura.produtoNome ? `${assinatura.produtoNome} — ` : ''}${assinatura.planoNome}.`,
      });
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao executar a ação', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-6 py-5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.accent}`}>
            {meta.icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{meta.titulo}</h2>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {assinatura.produtoNome ? `${assinatura.produtoNome} — ` : ''}
              {assinatura.planoNome}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {acao === 'renovar' && (
            <>
              <div className="mb-4 flex gap-2.5 rounded-[11px] border border-amber-400/25 bg-amber-400/5 px-3.5 py-3 text-xs leading-relaxed text-amber-200/90">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>A fatura é registrada como pendente. O link de pagamento (InfinitePay) é integração futura.</span>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="aa-valor" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">
                    Valor (R$)
                  </label>
                  <input
                    id="aa-valor"
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
                        type="button"
                        onClick={() => setMetodo(m)}
                        className={`flex-1 cursor-pointer rounded-md px-2 py-2 text-[12.5px] font-medium transition-colors ${
                          metodo === m ? 'bg-on-lime font-semibold text-on-black' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="aa-due" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">
                    Vencimento
                  </label>
                  <input
                    id="aa-due"
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                    className="on-num h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50"
                  />
                </div>
              </div>
            </>
          )}

          {acao === 'suspender' && (
            <div className="flex gap-2.5 rounded-[11px] border border-amber-400/25 bg-amber-400/[0.06] px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-200">
              <Pause className="mt-0.5 h-[17px] w-[17px] shrink-0" />
              <span>
                Suspender pausa esta assinatura (acesso interrompido), mas <b>preserva o histórico</b> e pode ser
                reativada depois.
              </span>
            </div>
          )}

          {acao === 'reativar' && (
            <div className="flex gap-2.5 rounded-[11px] border border-on-lime/25 bg-on-lime/[0.06] px-3.5 py-3 text-[12.5px] leading-relaxed text-on-lime/90">
              <Play className="mt-0.5 h-[17px] w-[17px] shrink-0" />
              <span>Reativar volta a assinatura ao estado vigente.</span>
            </div>
          )}

          {acao === 'cancelar' && (
            <div className="flex gap-2.5 rounded-[11px] border border-red-500/25 bg-red-500/[0.06] px-3.5 py-3 text-[12.5px] leading-relaxed text-red-200">
              <AlertTriangle className="mt-0.5 h-[17px] w-[17px] shrink-0" />
              <span>
                Cancelar <b>encerra</b> esta assinatura. O histórico de faturas é mantido, mas a cobrança recorrente
                não continua.
              </span>
            </div>
          )}

          {/* Gate de senha do admin */}
          {exigeSenha && (
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <label htmlFor="aa-senha" className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Confirme com a sua senha de admin
              </label>
              <input
                id="aa-senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErroSenha(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && podeConfirmar && handleConfirm()}
                placeholder="Sua senha"
                className={`h-10 w-full rounded-[9px] border bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors ${
                  erroSenha ? 'border-red-500/60' : 'border-white/10 focus:border-on-lime/50'
                }`}
              />
              {erroSenha && <p className="mt-1.5 text-[11.5px] text-red-300">{erroSenha}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
          {acao === 'renovar' ? (
            <div>
              <div className="text-[11.5px] text-muted-foreground/80">Total</div>
              <div className="on-num text-xl font-bold text-on-lime">{brl(valorCentavos / 100)}</div>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
            >
              <X className="h-4 w-4" /> Fechar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!podeConfirmar}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-[10px] px-5 py-2.5 text-[13.5px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                acao === 'cancelar'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-on-lime text-on-black hover:shadow-[0_0_22px_rgba(96,255,0,0.35)]'
              }`}
            >
              <Check className="h-4 w-4" /> {busy ? 'Processando…' : meta.cta}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssinaturaAcaoModal;
