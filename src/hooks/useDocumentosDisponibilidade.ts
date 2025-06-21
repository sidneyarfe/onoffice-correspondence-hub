
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DocumentoDisponibilidade {
  id: string;
  user_id: string;
  documento_tipo: string;
  disponivel: boolean;
  created_at: string;
  updated_at: string;
}

export const useDocumentosDisponibilidade = () => {
  const { user } = useAuth();
  const [disponibilidade, setDisponibilidade] = useState<DocumentoDisponibilidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisponibilidade = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('documentos_disponibilidade')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;
        
        // Se não há registros, criar os padrões
        if (!data || data.length === 0) {
          await criarDocumentosPadrao();
        } else {
          setDisponibilidade(data);
        }
      } catch (error) {
        console.error('Erro ao buscar disponibilidade de documentos:', error);
      } finally {
        setLoading(false);
      }
    };

    const criarDocumentosPadrao = async () => {
      if (!user?.id) return;

      const documentosPadrao = ['IPTU', 'AVCB', 'INSCRICAO_ESTADUAL'];
      
      try {
        const registros = documentosPadrao.map(tipo => ({
          user_id: user.id,
          documento_tipo: tipo,
          disponivel: true
        }));

        const { data, error } = await supabase
          .from('documentos_disponibilidade')
          .insert(registros)
          .select();

        if (error) throw error;
        setDisponibilidade(data || []);
      } catch (error) {
        console.error('Erro ao criar documentos padrão:', error);
      }
    };

    fetchDisponibilidade();
  }, [user?.id]);

  const isDocumentoDisponivel = (tipo: string): boolean => {
    const doc = disponibilidade.find(d => d.documento_tipo === tipo);
    return doc ? doc.disponivel : true; // Padrão é disponível
  };

  return { 
    disponibilidade, 
    loading, 
    isDocumentoDisponivel 
  };
};
