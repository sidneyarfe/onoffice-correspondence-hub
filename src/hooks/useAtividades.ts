
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Atividade {
  id: string;
  acao: string;
  descricao: string;
  data_atividade: string;
}

export const useAtividades = () => {
  const { user } = useAuth();
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAtividades = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('atividades_cliente')
          .select('*')
          .eq('user_id', user.id)
          .order('data_atividade', { ascending: false })
          .limit(10);

        if (error) throw error;
        setAtividades(data || []);
      } catch (error) {
        console.error('Erro ao buscar atividades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAtividades();
  }, [user?.id]);

  return { atividades, loading };
};
