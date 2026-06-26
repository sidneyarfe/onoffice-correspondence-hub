import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Camera, Check, X } from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calcularProximoVencimento, paraDataISO } from '@/utils/vencimento';
import { ClientAvatar, isPJ } from './clientesShared';
import { uploadAvatar } from './clientesStorage';

interface EditarClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: AdminClient | null;
  onSaved: () => void;
}

const inputCls =
  'h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50';
const labelCls = 'mb-1.5 block text-[11.5px] font-medium text-muted-foreground';

const EditarClienteModal: React.FC<EditarClienteModalProps> = ({ isOpen, onClose, client, onSaved }) => {
  const { toast } = useToast();
  const { produtos, planos } = useProducts();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [draft, setDraft] = useState({
    name: '',
    doc: '',
    email: '',
    phone: '',
    endereco: '',
    bairro: '',
    cep: '',
    cidade: '',
    estado: '',
    planoId: '' as string,
    avatar_url: undefined as string | undefined,
  });

  useEffect(() => {
    if (client && isOpen) {
      setDraft({
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
    }
  }, [client, isOpen]);

  const planoOptions = useMemo(() => {
    const nome = (pid: string) => produtos.find((p) => p.id === pid)?.nome_produto || '';
    return planos
      .filter((p) => p.ativo)
      .map((p) => ({ id: p.id, label: `${nome(p.produto_id)} — ${p.nome_plano}` }));
  }, [planos, produtos]);

  if (!client) return null;

  const set = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(client.id, file);
      setDraft((d) => ({ ...d, avatar_url: url }));
      toast({ title: 'Foto carregada', description: 'Salve para confirmar.' });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao enviar a foto',
        description: 'Aplique a migração de storage (bucket avatars).',
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

      // Mudança de plano → espelha plano/produto/preço/vencimento (igual ao fluxo de planos)
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

      toast({ title: 'Cliente atualizado', description: 'Os dados cadastrais foram salvos.' });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao salvar', description: 'Não foi possível atualizar o cliente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const previewClient: AdminClient = { ...client, name: draft.name, avatar_url: draft.avatar_url };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[680px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold">Editar cliente</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">Atualize os dados cadastrais do cliente.</p>
          </div>
        </div>

        <div className="max-h-[64vh] overflow-y-auto px-6 py-5">
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
              <label className={labelCls}>{isPJ(client) ? 'Razão social' : 'Nome completo'}</label>
              <input value={draft.name} onChange={set('name')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{isPJ(client) ? 'CNPJ' : 'CPF'}</label>
              <input value={draft.doc} onChange={set('doc')} className={`${inputCls} on-num`} />
            </div>
            <div>
              <label className={labelCls}>Plano</label>
              <select
                value={draft.planoId}
                onChange={(e) => setDraft((d) => ({ ...d, planoId: e.target.value }))}
                className={`${inputCls} cursor-pointer appearance-none`}
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
              <label className={labelCls}>E-mail</label>
              <input value={draft.email} onChange={set('email')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input value={draft.phone} onChange={set('phone')} className={`${inputCls} on-num`} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Logradouro e número</label>
              <input value={draft.endereco} onChange={set('endereco')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bairro</label>
              <input value={draft.bairro} onChange={set('bairro')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>CEP</label>
              <input value={draft.cep} onChange={set('cep')} className={`${inputCls} on-num`} />
            </div>
            <div>
              <label className={labelCls}>Cidade</label>
              <input value={draft.cidade} onChange={set('cidade')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <input value={draft.estado} onChange={set('estado')} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] px-6 py-4">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
          >
            <X className="h-4 w-4" /> Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditarClienteModal;
