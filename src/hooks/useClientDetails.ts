
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClientActivity {
  id: string;
  acao: string;
  descricao: string;
  data_atividade: string;
}

export interface ClientCorrespondence {
  id: string;
  remetente: string;
  assunto: string;
  descricao: string | null;
  data_recebimento: string;
  visualizada: boolean;
  categoria: string;
}

export const useClientDetails = (clientId: string | null) => {
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [correspondences, setCorrespondences] = useState<ClientCorrespondence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientDetails = async () => {
    if (!clientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Buscar contratação para obter user_id
      const { data: contratacao, error: contratacaoError } = await supabase
        .from('contratacoes_clientes')
        .select('user_id')
        .eq('id', clientId)
        .single();

      if (contratacaoError) {
        throw contratacaoError;
      }

      if (contratacao?.user_id) {
        // Buscar atividades
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('atividades_cliente')
          .select('*')
          .eq('user_id', contratacao.user_id)
          .order('data_atividade', { ascending: false })
          .limit(20);

        if (activitiesError) {
          console.error('Erro ao buscar atividades:', activitiesError);
        }

        // Buscar correspondências
        const { data: correspondencesData, error: correspondencesError } = await supabase
          .from('correspondencias')
          .select('*')
          .eq('user_id', contratacao.user_id)
          .order('data_recebimento', { ascending: false })
          .limit(20);

        if (correspondencesError) {
          console.error('Erro ao buscar correspondências:', correspondencesError);
        }

        setActivities(activitiesData || []);
        setCorrespondences(correspondencesData || []);
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes do cliente:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
    } else {
      setActivities([]);
      setCorrespondences([]);
      setError(null);
    }
  }, [clientId]);

  return {
    activities,
    correspondences,
    loading,
    error,
    refetch: fetchClientDetails
  };
};
