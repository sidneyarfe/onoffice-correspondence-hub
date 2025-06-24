
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Correspondencia {
  id: string;
  remetente: string;
  assunto: string;
  descricao: string | null;
  data_recebimento: string;
  visualizada: boolean;
  categoria: string;
  arquivo_url: string | null;
}

export const useCorrespondencias = () => {
  const { user } = useAuth();
  const [correspondencias, setCorrespondencias] = useState<Correspondencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCorrespondencias = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('correspondencias')
          .select('*')
          .eq('user_id', user.id)
          .order('data_recebimento', { ascending: false });

        if (error) throw error;
        setCorrespondencias(data || []);
      } catch (error) {
        console.error('Erro ao buscar correspondências:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCorrespondencias();

    // Configurar realtime para novas correspondências
    if (user?.id) {
      const channel = supabase
        .channel('correspondencias-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'correspondencias',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            console.log('Nova correspondência recebida:', payload);
            const novaCorrespondencia = payload.new as Correspondencia;
            
            // Adicionar à lista local
            setCorrespondencias(prev => [novaCorrespondencia, ...prev]);
            
            // Criar notificação automática
            try {
              await supabase
                .from('notificacoes')
                .insert({
                  user_id: user.id,
                  titulo: 'Nova Correspondência Recebida',
                  mensagem: `Você recebeu uma nova correspondência de ${novaCorrespondencia.remetente} com o assunto: ${novaCorrespondencia.assunto}`,
                  tipo: 'info'
                });
            } catch (error) {
              console.error('Erro ao criar notificação:', error);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const marcarComoLida = async (correspondenciaId: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('correspondencias')
        .update({ visualizada: true })
        .eq('id', correspondenciaId)
        .eq('user_id', user.id);

      // Atualizar estado local
      setCorrespondencias(prev => 
        prev.map(c => 
          c.id === correspondenciaId 
            ? { ...c, visualizada: true }
            : c
        )
      );

      // Registrar atividade
      await supabase.rpc('registrar_atividade', {
        p_user_id: user.id,
        p_acao: 'correspondencia_visualizada',
        p_descricao: `Correspondência visualizada`
      });
    } catch (error) {
      console.error('Erro ao marcar correspondência como lida:', error);
    }
  };

  const getFileUrl = async (filePath: string) => {
    try {
      // Primeiro tentar obter URL assinada para acesso seguro
      const { data, error } = await supabase.storage
        .from('correspondencias')
        .createSignedUrl(filePath, 3600); // URL válida por 1 hora

      if (error) {
        console.error('Erro ao criar URL assinada:', error);
        // Fallback para URL pública se houver erro
        const { data: publicData } = supabase.storage
          .from('correspondencias')
          .getPublicUrl(filePath);
        return publicData?.publicUrl || null;
      }

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Erro ao obter URL do arquivo:', error);
      return null;
    }
  };

  return { correspondencias, loading, marcarComoLida, getFileUrl };
};
