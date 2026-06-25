// Epic 004 — Hooks de dados do CRM (TanStack Query). Leitura direta via client anon (RLS
// admin via is_onoffice_admin()); escrita idem. Ver src/integrations/supabase/crm.ts.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  crmFrom,
  type CrmEtapa,
  type CrmNegocio,
  type CrmContato,
  type CrmTag,
  type CrmAtividade,
  type CrmEtapaTipo,
  type CrmOrigem,
  type CrmAtividadeTipo,
} from '@/integrations/supabase/crm';

const KEYS = {
  etapas: ['crm', 'etapas'] as const,
  negocios: ['crm', 'negocios'] as const,
  contatos: ['crm', 'contatos'] as const,
  tags: ['crm', 'tags'] as const,
  atividades: (negocioId: string) => ['crm', 'atividades', negocioId] as const,
};

// Contato + tags + contagem de negócios (para a página Contatos)
export type CrmContatoComResumo = CrmContato & { tags: CrmTag[]; total_negocios: number };

export function useCrmContatos() {
  return useQuery({
    queryKey: KEYS.contatos,
    queryFn: async (): Promise<CrmContatoComResumo[]> => {
      const { data, error } = await crmFrom('crm_contatos')
        .select('*, crm_contato_tags(crm_tags(*)), crm_negocios(count)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      type Row = CrmContato & {
        crm_contato_tags?: { crm_tags: CrmTag }[] | null;
        crm_negocios?: { count: number }[] | null;
      };
      return ((data ?? []) as Row[]).map((c) => ({
        ...c,
        tags: (c.crm_contato_tags ?? []).map((jt) => jt.crm_tags).filter(Boolean),
        total_negocios: c.crm_negocios?.[0]?.count ?? 0,
      }));
    },
  });
}

// ─── Etapas ──────────────────────────────────────────────────────────────────
export function useCrmEtapas() {
  return useQuery({
    queryKey: KEYS.etapas,
    queryFn: async (): Promise<CrmEtapa[]> => {
      const { data, error } = await crmFrom('crm_etapas')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmEtapa[];
    },
  });
}

// ─── Negócios (com contato + tags embutidos) ──────────────────────────────────
type NegocioRow = CrmNegocio & {
  crm_negocio_tags?: { crm_tags: CrmTag }[] | null;
};

export function useCrmNegocios() {
  return useQuery({
    queryKey: KEYS.negocios,
    queryFn: async (): Promise<CrmNegocio[]> => {
      const { data, error } = await crmFrom('crm_negocios')
        .select('*, contato:crm_contatos(*), crm_negocio_tags(crm_tags(*))')
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as NegocioRow[]).map((n) => ({
        ...n,
        tags: (n.crm_negocio_tags ?? []).map((jt) => jt.crm_tags).filter(Boolean),
      }));
    },
  });
}

// ─── Tags ─────────────────────────────────────────────────────────────────────
export function useCrmTags() {
  return useQuery({
    queryKey: KEYS.tags,
    queryFn: async (): Promise<CrmTag[]> => {
      const { data, error } = await crmFrom('crm_tags').select('*').order('nome', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmTag[];
    },
  });
}

// ─── Atividades de um negócio ──────────────────────────────────────────────────
export function useCrmAtividades(negocioId: string | null) {
  return useQuery({
    queryKey: negocioId ? KEYS.atividades(negocioId) : ['crm', 'atividades', 'none'],
    enabled: !!negocioId,
    queryFn: async (): Promise<CrmAtividade[]> => {
      const { data, error } = await crmFrom('crm_atividades')
        .select('*')
        .eq('negocio_id', negocioId)
        .order('data_atividade', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmAtividade[];
    },
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────────
export function useCrmMutations() {
  const qc = useQueryClient();
  const invalidateNegocios = () => qc.invalidateQueries({ queryKey: KEYS.negocios });

  const moverEtapa = useMutation({
    mutationFn: async (args: { id: string; etapa_id: string; status: CrmEtapaTipo; ordem?: number }) => {
      const patch: Record<string, unknown> = { etapa_id: args.etapa_id, status: args.status };
      if (args.ordem !== undefined) patch.ordem = args.ordem;
      const { error } = await crmFrom('crm_negocios').update(patch).eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: invalidateNegocios,
  });

  const atualizarNegocio = useMutation({
    mutationFn: async (args: { id: string } & Partial<CrmNegocio>) => {
      const { id, contato, tags, ...patch } = args;
      void contato; void tags; // campos derivados — não persistem
      const { error } = await crmFrom('crm_negocios').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateNegocios,
  });

  const criarNegocioManual = useMutation({
    mutationFn: async (args: {
      nome: string; email?: string | null; telefone?: string | null;
      origem?: CrmOrigem; titulo: string; valor_centavos?: number | null;
      plano_id?: string | null; etapa_id: string | null;
    }) => {
      const { data: contato, error: cErr } = await crmFrom('crm_contatos')
        .insert({
          nome: args.nome,
          email: args.email ?? null,
          telefone: args.telefone ?? null,
          origem: args.origem ?? 'manual',
        })
        .select('id')
        .single();
      if (cErr) throw cErr;
      const { error: nErr } = await crmFrom('crm_negocios').insert({
        contato_id: contato.id,
        titulo: args.titulo,
        valor_centavos: args.valor_centavos ?? null,
        plano_id: args.plano_id ?? null,
        etapa_id: args.etapa_id,
        status: 'aberto',
      });
      if (nErr) throw nErr;
    },
    onSuccess: invalidateNegocios,
  });

  const criarAtividade = useMutation({
    mutationFn: async (args: {
      negocio_id: string; tipo: CrmAtividadeTipo; descricao: string; concluida?: boolean;
    }) => {
      const { error } = await crmFrom('crm_atividades').insert({
        negocio_id: args.negocio_id,
        tipo: args.tipo,
        descricao: args.descricao,
        concluida: args.concluida ?? false,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: KEYS.atividades(vars.negocio_id) }),
  });

  const alternarAtividade = useMutation({
    mutationFn: async (args: { id: string; negocio_id: string; concluida: boolean }) => {
      const { error } = await crmFrom('crm_atividades').update({ concluida: args.concluida }).eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: KEYS.atividades(vars.negocio_id) }),
  });

  const criarTag = useMutation({
    mutationFn: async (args: { nome: string; cor?: string | null }): Promise<CrmTag> => {
      const { data, error } = await crmFrom('crm_tags')
        .insert({ nome: args.nome, cor: args.cor ?? null })
        .select('*')
        .single();
      if (error) throw error;
      return data as CrmTag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tags }),
  });

  const excluirNegocio = useMutation({
    mutationFn: async (args: { id: string }) => {
      // ON DELETE CASCADE remove atividades e vínculos de tag do negócio.
      const { error } = await crmFrom('crm_negocios').delete().eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: invalidateNegocios,
  });

  const vincularTagNegocio = useMutation({
    mutationFn: async (args: { negocio_id: string; tag_id: string; vincular: boolean }) => {
      if (args.vincular) {
        const { error } = await crmFrom('crm_negocio_tags')
          .upsert({ negocio_id: args.negocio_id, tag_id: args.tag_id });
        if (error) throw error;
      } else {
        const { error } = await crmFrom('crm_negocio_tags')
          .delete()
          .eq('negocio_id', args.negocio_id)
          .eq('tag_id', args.tag_id);
        if (error) throw error;
      }
    },
    onSuccess: invalidateNegocios,
  });

  return {
    moverEtapa,
    atualizarNegocio,
    criarNegocioManual,
    excluirNegocio,
    criarAtividade,
    alternarAtividade,
    criarTag,
    vincularTagNegocio,
  };
}
