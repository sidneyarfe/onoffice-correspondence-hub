
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  data_criacao: string;
  data_leitura: string | null;
}

export const useNotificacoes = () => {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotificacoes = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('notificacoes')
          .select('*')
          .eq('user_id', user.id)
          .order('data_criacao', { ascending: false });

        if (error) throw error;
        setNotificacoes(data || []);
      } catch (err) {
        console.error('Erro ao buscar notificações:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchNotificacoes();
  }, [user?.id]);

  const marcarComoLida = async (notificacaoId: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('notificacoes')
        .update({ 
          lida: true,
          data_leitura: new Date().toISOString()
        })
        .eq('id', notificacaoId)
        .eq('user_id', user.id);

      // Atualizar estado local
      setNotificacoes(prev => 
        prev.map(n => 
          n.id === notificacaoId 
            ? { ...n, lida: true, data_leitura: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return { 
    notificacoes, 
    loading, 
    error, 
    marcarComoLida, 
    naoLidas 
  };
};
