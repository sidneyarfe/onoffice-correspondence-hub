
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminDocument {
  id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  arquivo_url: string | null;
  disponivel_por_padrao: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientDocumentAccess {
  id: string;
  user_id: string;
  documento_tipo: string;
  disponivel: boolean;
  cliente_nome: string;
  cliente_email: string;
}

export const useAdminDocuments = () => {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('documentos_admin')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDocuments(data || []);
    } catch (err) {
      console.error('Erro ao buscar documentos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (documentData: Partial<AdminDocument>) => {
    try {
      const { data, error: createError } = await supabase
        .from('documentos_admin')
        .insert([documentData])
        .select()
        .single();

      if (createError) throw createError;
      
      setDocuments(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Erro ao criar documento:', err);
      throw err;
    }
  };

  const updateDocument = async (id: string, updates: Partial<AdminDocument>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('documentos_admin')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setDocuments(prev => 
        prev.map(doc => doc.id === id ? data : doc)
      );
      return data;
    } catch (err) {
      console.error('Erro ao atualizar documento:', err);
      throw err;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('documentos_admin')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err) {
      console.error('Erro ao excluir documento:', err);
      throw err;
    }
  };

  const getClientDocumentAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos_disponibilidade')
        .select(`
          *,
          contratacoes_clientes!inner(nome_responsavel, email)
        `);

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        documento_tipo: item.documento_tipo,
        disponivel: item.disponivel,
        cliente_nome: item.contratacoes_clientes?.nome_responsavel || 'Nome não encontrado',
        cliente_email: item.contratacoes_clientes?.email || 'Email não encontrado'
      })) || [];
    } catch (err) {
      console.error('Erro ao buscar acessos de documentos:', err);
      throw err;
    }
  };

  const updateClientDocumentAccess = async (userId: string, documentType: string, available: boolean) => {
    try {
      const { error } = await supabase
        .from('documentos_disponibilidade')
        .upsert({
          user_id: userId,
          documento_tipo: documentType,
          disponivel: available
        });

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao atualizar acesso do cliente:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    getClientDocumentAccess,
    updateClientDocumentAccess
  };
};
