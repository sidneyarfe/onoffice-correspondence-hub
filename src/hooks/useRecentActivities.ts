import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RecentActivity {
  id: string;
  user_id: string;
  acao: string;
  descricao: string;
  data_atividade: string;
  ip_address: string | null;
  user_agent: string | null;
  user_name?: string;
  user_email?: string;
}

export const useRecentActivities = () => {
  const {
    data: activities = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      // Buscar atividades recentes
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('atividades_cliente')
        .select('*')
        .order('data_atividade', { ascending: false })
        .limit(10);

      if (activitiesError) throw activitiesError;
      
      // Buscar informações dos usuários para as atividades
      const userIds = [...new Set(activitiesData.map(a => a.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      
      // Mapear dados para incluir informações do usuário
      const mappedActivities = activitiesData.map(activity => {
        const profile = profilesData.find(p => p.id === activity.user_id);
        return {
          id: activity.id,
          user_id: activity.user_id,
          acao: activity.acao,
          descricao: activity.descricao,
          data_atividade: activity.data_atividade,
          ip_address: activity.ip_address,
          user_agent: activity.user_agent,
          user_name: profile?.full_name || 'Usuário desconhecido',
          user_email: profile?.email || '',
        };
      });

      return mappedActivities as RecentActivity[];
    },
  });

  return {
    activities,
    isLoading,
    error: error?.message,
    refetch,
  };
};