import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, FileCheck2, FileSignature, Info, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { registrarAtividade } from '@/utils/atividade';
import { pinDescricao } from './docPin';
import type { AssinaturaItem } from '@/hooks/useClienteComercio';

const DOC_BUCKET = 'documentos_fiscais';
const sanitize = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]+/g, '_');

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  assinatura: AssinaturaItem | null;
  onDone: () => void;
}

/**
 * Registra o CONTRATO assinado na ASSINATURA (manual). Marca `zapsign_signed_at`, avança o
 * status para `aguardando_pagamento` e fixa o documento no card daquela assinatura.
 */
const RegistrarContratoAssinaturaModal: React.FC<Props> = ({ isOpen, onClose, userId, assinatura, onDone }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setSaving(false);
    }
  }, [isOpen]);

  if (!assinatura) return null;

  const handleConfirm = async () => {
    if (!userId) {
      toast({ title: 'Cliente sem acesso', description: 'Provisione o usuário do cliente para registrar o contrato.', variant: 'destructive' });
      return;
    }
    if (!file) return;
    setSaving(true);
    try {
      const nomeAss = `${assinatura.produtoNome ? `${assinatura.produtoNome} — ` : ''}${assinatura.planoNome}`;

      const path = `cliente/${userId}/contrato-${Date.now()}-${sanitize(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(DOC_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(DOC_BUCKET).getPublicUrl(path);

      const { error: docErr } = await supabase.from('documentos_cliente').insert({
        user_id: userId,
        nome_documento: `Contrato assinado — ${assinatura.planoNome}`,
        tipo: 'Contrato assinado',
        descricao: pinDescricao(assinatura.id, nomeAss),
        arquivo_url: urlData.publicUrl,
        data_emissao: new Date().toISOString().slice(0, 10),
        tamanho_kb: Math.max(1, Math.round(file.size / 1024)),
      } as never);
      if (docErr) throw docErr;

      const { error: assErr } = await supabase
        .from('assinaturas')
        .update({ status: 'aguardando_pagamento', zapsign_signed_at: new Date().toISOString(), updated_at: new Date().toISOString() } as never)
        .eq('id', assinatura.id);
      if (assErr) throw assErr;

      await registrarAtividade(userId, 'contrato_registrado', `Contrato assinado anexado — ${nomeAss} (admin)`);
      toast({ title: 'Contrato registrado', description: 'A assinatura avançou para a etapa de pagamento.' });
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao registrar contrato',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-6 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-400/15 text-indigo-200">
            <FileSignature className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Registrar contrato assinado</h2>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {assinatura.produtoNome ? `${assinatura.produtoNome} — ` : ''}
              {assinatura.planoNome}
            </p>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex gap-2.5 rounded-[11px] border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Normalmente automático via ZapSign (webhook). O registro manual é liberado ao anexar o contrato assinado —
              o documento fica fixado nesta assinatura e ela avança para o pagamento.
            </span>
          </div>

          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
              file ? 'border-on-lime/40 bg-on-lime/[0.05]' : 'border-white/12 hover:border-white/25'
            }`}
          >
            {file ? (
              <>
                <FileCheck2 className="h-6 w-6 text-on-lime" />
                <div className="mt-2 text-[13.5px] font-semibold">{file.name}</div>
                <div className="mt-0.5 text-[11.5px] text-on-lime">Anexado · clique para trocar</div>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <div className="mt-2 text-[13.5px] font-semibold">Anexar contrato assinado</div>
                <div className="mt-0.5 text-[11.5px] text-muted-foreground/80">PDF ou imagem (máx. 10MB)</div>
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
                setFile(f);
              }}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
          >
            <X className="h-4 w-4" /> Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!file || saving}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> {saving ? 'Registrando…' : 'Registrar contrato'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrarContratoAssinaturaModal;
