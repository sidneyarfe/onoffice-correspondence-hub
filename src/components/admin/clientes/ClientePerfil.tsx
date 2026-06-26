import React, { useState } from 'react';
import { ArrowLeft, Camera, Check, Package } from 'lucide-react';
import type { AdminClient } from '@/hooks/useAdminClients';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClientAvatar, isPJ } from './clientesShared';
import { uploadAvatar } from './clientesStorage';

interface ClientePerfilProps {
  client: AdminClient;
  onBack: () => void;
  onSaved: () => void;
}

interface PerfilDraft {
  name: string;
  email: string;
  phone: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  avatar_url?: string;
}

const inputCls =
  'h-[42px] w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-sm outline-none transition-colors focus:border-on-lime/50';
const labelCls = 'mb-1.5 block text-[11.5px] font-medium text-muted-foreground';

const ClientePerfil: React.FC<ClientePerfilProps> = ({ client, onBack, onSaved }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<PerfilDraft>({
    name: client.name,
    email: client.email,
    phone: client.telefone,
    endereco: client.endereco,
    bairro: client.bairro || '',
    cidade: client.cidade,
    estado: client.estado,
    cep: client.cep,
    avatar_url: client.avatar_url,
  });

  const set = (k: keyof PerfilDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

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
        description: 'Verifique se a migração de storage (bucket avatars) foi aplicada.',
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
      if (isPJ(client)) payload.razao_social = draft.name;
      else payload.nome_responsavel = draft.name;

      const { error } = await supabase.from('contratacoes_clientes').update(payload as never).eq('id', client.id);
      if (error) throw error;
      toast({ title: 'Perfil atualizado', description: 'Os dados do cliente foram salvos.' });
      onSaved();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar as alterações.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const previewClient: AdminClient = { ...client, name: draft.name, avatar_url: draft.avatar_url };

  return (
    <div className="max-w-[840px]">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para a ficha
      </button>

      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Perfil do cliente</h1>
        <span className="rounded-full bg-indigo-400/15 px-2.5 py-1 text-[10.5px] font-bold text-indigo-200">
          Visão do cliente
        </span>
      </div>
      <p className="mb-5 text-[13.5px] text-muted-foreground">Mantenha os dados cadastrais sempre atualizados.</p>

      <div className="rounded-2xl border border-white/[0.08] bg-card p-6">
        <div className="mb-5 flex items-center gap-[18px] border-b border-white/[0.06] pb-5">
          <label className="relative shrink-0 cursor-pointer">
            <ClientAvatar client={previewClient} size={64} rounded="1rem" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-[26px] w-[26px] items-center justify-center rounded-full border-[3px] border-card bg-on-lime text-on-black">
              <Camera className="h-[13px] w-[13px]" />
            </span>
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" disabled={uploading} />
          </label>
          <div>
            <div className="text-lg font-bold">{draft.name}</div>
            <div className="mt-0.5 text-[12.5px] text-muted-foreground">
              {uploading ? 'Enviando foto…' : 'Clique na foto para alterar a imagem de perfil'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>{isPJ(client) ? 'Razão social' : 'Nome completo'}</label>
            <input value={draft.name} onChange={set('name')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>E-mail</label>
            <input value={draft.email} onChange={set('email')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input value={draft.phone} onChange={set('phone')} className={`${inputCls} on-num`} />
          </div>

          <div className="mt-1 border-t border-white/[0.06] pt-4 sm:col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Endereço</div>
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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <Package className="h-[15px] w-[15px] text-muted-foreground/70" />
            Plano: <span className="text-foreground/80">{client.plan}</span> · alterações de plano são feitas pelo suporte
          </div>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:opacity-60"
          >
            <Check className="h-[15px] w-[15px]" /> {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientePerfil;
