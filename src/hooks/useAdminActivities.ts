import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminActivity {
  id: string;
  user_id: string;
  acao: string;
  descricao: string;
  data_atividade: string;
  ip_address: string | null;
  user_agent: string | null;
}

export const useAdminActivities = (adminId: string) => {
  const {
    data: activities = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-activities', adminId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atividades_cliente')
        .select('*')
        .eq('user_id', adminId)
        .order('data_atividade', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AdminActivity[];
    },
    enabled: !!adminId,
  });

  return {
    activities,
    isLoading,
    error: error?.message,
  };
};