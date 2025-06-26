
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

  const uploadDocumentFile = async (file: File, tipo: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tipo}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
      throw error;
    }
  };

  const deleteDocumentFile = async (filePath: string) => {
    try {
      const { error } = await supabase.storage
        .from('documentos')
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      throw error;
    }
  };

  const createDocument = async (documentData: Omit<AdminDocument, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: createError } = await supabase
        .from('documentos_admin')
        .insert([{
          tipo: documentData.tipo,
          nome: documentData.nome,
          descricao: documentData.descricao,
          arquivo_url: documentData.arquivo_url,
          disponivel_por_padrao: documentData.disponivel_por_padrao
        }])
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
      // Buscar o documento para obter a URL do arquivo
      const document = documents.find(doc => doc.id === id);
      
      // Deletar arquivo do storage se existir
      if (document?.arquivo_url) {
        await deleteDocumentFile(document.arquivo_url);
      }

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

  const getPublicUrl = async (filePath: string) => {
    try {
      const { data } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao obter URL pública:', error);
      return null;
    }
  };

  const getClientDocumentAccess = async () => {
    try {
      // Buscar disponibilidade de documentos e dados dos clientes separadamente
      const { data: availability, error: availabilityError } = await supabase
        .from('documentos_disponibilidade')
        .select('*');

      if (availabilityError) throw availabilityError;

      // Buscar dados dos clientes
      const userIds = availability?.map(item => item.user_id) || [];
      const { data: clients, error: clientsError } = await supabase
        .from('contratacoes_clientes')
        .select('user_id, nome_responsavel, email')
        .in('user_id', userIds);

      if (clientsError) throw clientsError;

      // Combinar os dados
      const result = availability?.map(item => {
        const client = clients?.find(c => c.user_id === item.user_id);
        return {
          id: item.id,
          user_id: item.user_id,
          documento_tipo: item.documento_tipo,
          disponivel: item.disponivel,
          cliente_nome: client?.nome_responsavel || 'Nome não encontrado',
          cliente_email: client?.email || 'Email não encontrado'
        };
      }) || [];

      return result;
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
    uploadDocumentFile,
    deleteDocumentFile,
    getPublicUrl,
    getClientDocumentAccess,
    updateClientDocumentAccess
  };
};
