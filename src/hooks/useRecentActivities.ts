import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AtorTipo = 'cliente' | 'admin' | 'sistema';

export interface RecentActivity {
  id: string;
  user_id: string;
  acao: string;
  descricao: string;
  data_atividade: string;
  /** Cliente relacionado à atividade (dono do feed) — nome de exibição. */
  clienteNome: string;
  /** id da contratação (para navegar até a ficha); null se a atividade não é de um cliente. */
  clienteId: string | null;
  /** Quem realizou a ação (null em registros antigos, antes da coluna existir). */
  atorNome: string | null;
  /** Natureza do ator: cliente, admin ou ação automática do sistema. */
  atorTipo: AtorTipo | null;
}

export const useRecentActivities = () => {
  const {
    data: activities = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      // Atividades recentes (registros brutos)
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('atividades_cliente')
        .select('*')
        .order('data_atividade', { ascending: false })
        .limit(12);

      if (activitiesError) throw activitiesError;

      const rows = (activitiesData ?? []) as Array<Record<string, unknown>>;
      const userIds = [...new Set(rows.map((a) => a.user_id as string))].filter(Boolean);

      // Cliente relacionado (nome de exibição = razão social / responsável) + id da ficha
      const clienteByUser = new Map<string, { id: string; nome: string }>();
      // Fallback: nome do perfil (quando a atividade é de um usuário sem contratação, ex.: admin)
      const nomePerfilByUser = new Map<string, string>();

      if (userIds.length) {
        const [contratRes, profilesRes] = await Promise.all([
          supabase
            .from('contratacoes_clientes')
            .select('id, user_id, razao_social, nome_responsavel')
            .in('user_id', userIds),
          supabase.from('profiles').select('id, full_name').in('id', userIds),
        ]);

        (contratRes.data ?? []).forEach(
          (c: { id: string; user_id: string | null; razao_social: string | null; nome_responsavel: string | null }) => {
            if (!c.user_id) return;
            clienteByUser.set(c.user_id, {
              id: c.id,
              nome: c.razao_social || c.nome_responsavel || 'Cliente',
            });
          },
        );
        (profilesRes.data ?? []).forEach((p: { id: string; full_name: string | null }) => {
          if (p.full_name) nomePerfilByUser.set(p.id, p.full_name);
        });
      }

      return rows.map((a) => {
        const userId = a.user_id as string;
        const cliente = clienteByUser.get(userId);
        const atorTipo = (a.ator_tipo as AtorTipo | null | undefined) ?? null;
        return {
          id: a.id as string,
          user_id: userId,
          acao: a.acao as string,
          descricao: a.descricao as string,
          data_atividade: a.data_atividade as string,
          clienteNome: cliente?.nome || nomePerfilByUser.get(userId) || 'Cliente não identificado',
          clienteId: cliente?.id ?? null,
          atorNome: (a.ator_nome as string | null | undefined) ?? null,
          atorTipo,
        } as RecentActivity;
      });
    },
  });

  return {
    activities,
    isLoading,
    error: error?.message,
    refetch,
  };
};
