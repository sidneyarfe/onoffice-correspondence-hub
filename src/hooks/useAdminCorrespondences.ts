import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminCorrespondence {
  id: string;
  remetente: string;
  assunto: string;
  descricao: string | null;
  data_recebimento: string;
  visualizada: boolean;
  categoria: string;
  arquivo_url: string | null;
  user_id: string;
  // Dados do cliente
  cliente_nome: string;
  cliente_email: string;
}

export const useAdminCorrespondences = () => {
  const [correspondences, setCorrespondences] = useState<AdminCorrespondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const isAdmin = () => {
    if (!user?.email) return false;
    
    return user.email === 'onoffice1893@gmail.com' || 
           user.email === 'contato@onofficebelem.com.br' ||
           user.email === 'sidneyferreira12205@gmail.com' ||
           user.email.includes('@onoffice.com') ||
           user.type === 'admin';
  };

  const fetchCorrespondences = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('=== BUSCANDO CORRESPONDÊNCIAS ADMIN ===');
      
      if (!isAdmin()) {
        console.error('Não autenticado como admin');
        setError('Usuário não é admin');
        setLoading(false);
        return;
      }

      // Buscar correspondências
      const { data: correspondenciasData, error: correspondenciasError } = await supabase
        .from('correspondencias')
        .select('*')
        .order('data_recebimento', { ascending: false });

      if (correspondenciasError) {
        console.error('Erro ao buscar correspondências:', correspondenciasError);
        setError(`Erro ao buscar correspondências: ${correspondenciasError.message}`);
        setCorrespondences([]);
        return;
      }

      console.log(`${correspondenciasData?.length || 0} correspondências encontradas`);

      // Buscar dados dos clientes para cada correspondência
      const correspondencesWithClientData = await Promise.all(
        (correspondenciasData || []).map(async (correspondencia) => {
          // Buscar dados do cliente através do user_id
          const { data: clientData } = await supabase
            .from('contratacoes_clientes')
            .select('nome_responsavel, email')
            .eq('user_id', correspondencia.user_id)
            .single();

          return {
            ...correspondencia,
            cliente_nome: clientData?.nome_responsavel || 'Cliente não encontrado',
            cliente_email: clientData?.email || 'Email não encontrado'
          };
        })
      );

      setCorrespondences(correspondencesWithClientData);
      console.log('Correspondências carregadas com dados dos clientes');
    } catch (err) {
      console.error('Erro geral ao buscar correspondências:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setCorrespondences([]);
    } finally {
      setLoading(false);
    }
  };

  const updateCorrespondenceStatus = async (id: string, visualizada: boolean) => {
    try {
      const { error } = await supabase
        .from('correspondencias')
        .update({ visualizada })
        .eq('id', id);

      if (error) throw error;

      // Atualizar estado local
      setCorrespondences(prev => 
        prev.map(c => 
          c.id === id ? { ...c, visualizada } : c
        )
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      throw err;
    }
  };

  const deleteCorrespondence = async (id: string) => {
    try {
      const { error } = await supabase
        .from('correspondencias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Atualizar estado local
      setCorrespondences(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Erro ao deletar correspondência:', err);
      throw err;
    }
  };

  useEffect(() => {
    // Adicionar delay para permitir que o AuthContext termine de configurar
    const timer = setTimeout(() => {
      fetchCorrespondences();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return {
    correspondences,
    loading,
    error,
    refetch: fetchCorrespondences,
    updateCorrespondenceStatus,
    deleteCorrespondence
  };
};
