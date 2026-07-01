import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, Info, Upload, FileCheck2, X } from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { uploadContrato } from './clientesStorage';

interface RegistrarContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: AdminClient | null;
  onDone: () => void;
}

const RegistrarContratoModal: React.FC<RegistrarContratoModalProps> = ({ isOpen, onClose, client, onDone }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setFile(null);
  }, [isOpen]);

  if (!client) return null;

  const handleConfirm = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const path = await uploadContrato(client.id, file);
      const nextStatus =
        client.status === 'iniciado' || client.status === 'contrato_enviado'
          ? 'CONTRATO_ASSINADO'
          : client.status_original;
      const { error } = await supabase
        .from('contratacoes_clientes')
        .update({
          contrato_assinado_url: path,
          status_contratacao: nextStatus,
          zapsign_signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', client.id);
      if (error) throw error;
      toast({ title: 'Contrato anexado', description: 'Assinatura registrada e contrato vinculado ao cliente.' });
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao registrar contrato',
        description: 'Verifique se o bucket de contratos foi criado pela migração.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[500px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold">Registrar contrato assinado</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{client.name}</p>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex gap-2.5 rounded-[11px] border border-indigo-400/28 bg-indigo-400/10 px-3.5 py-3 text-[12.5px] leading-relaxed text-indigo-200">
            <Info className="mt-0.5 h-[17px] w-[17px] shrink-0" />
            A assinatura normalmente é registrada de forma automática (ZapSign). O registro manual é liberado mediante
            anexo do contrato assinado.
          </div>

          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
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
                <div className="mt-0.5 text-[11.5px] text-muted-foreground/80">PDF assinado pelo cliente</div>
              </>
            )}
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] px-6 py-4">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
          >
            <X className="h-4 w-4" /> Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!file || saving}
            className="inline-flex items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> {saving ? 'Registrando…' : 'Registrar assinatura'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrarContratoModal;
