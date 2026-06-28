import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, FileText, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { registrarAtividade } from '@/utils/atividade';

const DOC_BUCKET = 'documentos_fiscais';

const sanitize = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]+/g, '_');

interface AnexarDocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  clientName: string;
  onDone: () => void;
}

const AnexarDocumentoModal: React.FC<AnexarDocumentoModalProps> = ({ isOpen, onClose, userId, clientName, onDone }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setNome('');
      setTipo('');
      setDescricao('');
      setSaving(false);
    }
  }, [isOpen]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'O arquivo deve ter no máximo 10MB.', variant: 'destructive' });
      return;
    }
    setFile(f);
    if (!nome) setNome(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleConfirm = async () => {
    if (!userId) {
      toast({ title: 'Cliente sem acesso', description: 'Provisione o usuário do cliente para anexar documentos.', variant: 'destructive' });
      return;
    }
    if (!file || !nome.trim()) {
      toast({ title: 'Dados incompletos', description: 'Selecione um arquivo e informe o nome.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const path = `cliente/${userId}/${Date.now()}-${sanitize(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(DOC_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(DOC_BUCKET).getPublicUrl(path);

      const { error: insErr } = await supabase.from('documentos_cliente').insert({
        user_id: userId,
        nome_documento: nome.trim(),
        tipo: tipo.trim() || 'Documento',
        descricao: descricao.trim() || null,
        arquivo_url: urlData.publicUrl,
        data_emissao: new Date().toISOString().slice(0, 10),
        tamanho_kb: Math.max(1, Math.round(file.size / 1024)),
      } as never);
      if (insErr) throw insErr;

      await registrarAtividade(userId, 'documento_anexado', `Documento anexado pelo admin: ${nome.trim()}`);
      toast({ title: 'Documento anexado', description: `${nome.trim()} foi anexado ao cliente.` });
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao anexar', description: 'Verifique se o bucket de documentos existe e tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50';

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-6 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-on-lime/10 text-on-lime">
            <FileText className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Anexar documento</h2>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{clientName}</p>
          </div>
        </div>

        <div className="px-6 py-5">
          <label
            htmlFor="ad-file"
            className="mb-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[11px] border-2 border-dashed border-white/15 px-4 py-6 text-center transition-colors hover:border-on-lime/40"
          >
            <Upload className="h-6 w-6 text-muted-foreground/70" />
            <span className="text-[12.5px] text-muted-foreground">
              {file ? <b className="text-foreground">{file.name}</b> : 'Clique para selecionar um arquivo'}
            </span>
            <span className="text-[11px] text-muted-foreground/60">PDF, imagens ou documentos (máx. 10MB)</span>
            <input id="ad-file" type="file" onChange={onPick} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          </label>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="ad-nome" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Nome do documento</label>
              <input id="ad-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Comprovante de endereço" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ad-tipo" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Tipo</label>
              <input id="ad-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ex.: IPTU, AVCB, Contrato…" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ad-desc" className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Descrição (opcional)</label>
              <input id="ad-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Observações" className={inputCls} />
            </div>
          </div>
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
            disabled={saving || !file || !nome.trim()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> {saving ? 'Anexando…' : 'Anexar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnexarDocumentoModal;
