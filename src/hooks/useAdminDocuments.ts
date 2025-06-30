
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

export const useAdminDocuments = () => {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAdminAuth = () => {
    try {
      const adminSession = localStorage.getItem('onoffice_admin_session');
      if (!adminSession) {
        console.log('🔒 Admin session não encontrada');
        return false;
      }

      const session = JSON.parse(adminSession);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const isValid = session.isAdmin && (Date.now() - session.timestamp <= TWENTY_FOUR_HOURS);
      
      console.log('🔒 Verificação admin session:', {
        isAdmin: session.isAdmin,
        timestampValid: Date.now() - session.timestamp <= TWENTY_FOUR_HOURS,
        isValid,
        adminEmail: session.adminEmail
      });
      
      return isValid;
    } catch (error) {
      console.error('🔒 Erro ao verificar admin session:', error);
      return false;
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📄 Iniciando busca de documentos admin...');
      
      if (!checkAdminAuth()) {
        console.error('📄 Não autenticado como admin');
        setError('Sessão admin não encontrada');
        setLoading(false);
        return;
      }

      console.log('📄 Fazendo query na tabela documentos_admin...');
      const { data, error: fetchError } = await supabase
        .from('documentos_admin')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Erro ao buscar documentos:', fetchError);
        setError(`Erro ao buscar documentos: ${fetchError.message}`);
        setDocuments([]);
      } else {
        console.log('✅ Documentos carregados:', data?.length || 0);
        setDocuments(data || []);
      }
    } catch (err) {
      console.error('❌ Erro geral ao buscar documentos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (documentData: Omit<AdminDocument, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('📝 Iniciando criação de documento:', documentData);
      
      if (!checkAdminAuth()) {
        throw new Error('Sessão admin não encontrada');
      }
      
      console.log('📝 Inserindo na tabela documentos_admin...');
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

      if (createError) {
        console.error('❌ Erro ao criar documento:', createError);
        throw new Error(`Erro ao criar documento: ${createError.message}`);
      }
      
      console.log('✅ Documento criado com sucesso:', data);
      await fetchDocuments();
      return data;
    } catch (err) {
      console.error('❌ Erro ao criar documento:', err);
      throw err;
    }
  };

  const updateDocument = async (id: string, updates: Partial<AdminDocument>) => {
    try {
      console.log('📝 Atualizando documento:', id, updates);
      
      if (!checkAdminAuth()) {
        throw new Error('Sessão admin não encontrada');
      }
      
      const { data, error: updateError } = await supabase
        .from('documentos_admin')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erro ao atualizar documento:', updateError);
        throw new Error(`Erro ao atualizar documento: ${updateError.message}`);
      }

      console.log('✅ Documento atualizado com sucesso:', data);
      await fetchDocuments();
      return data;
    } catch (err) {
      console.error('❌ Erro ao atualizar documento:', err);
      throw err;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      console.log('🗑️ Excluindo documento:', id);
      
      if (!checkAdminAuth()) {
        throw new Error('Sessão admin não encontrada');
      }
      
      // Buscar documento para obter arquivo_url antes de deletar
      const { data: documentToDelete } = await supabase
        .from('documentos_admin')
        .select('arquivo_url')
        .eq('id', id)
        .single();

      // Deletar arquivo do storage se existir
      if (documentToDelete?.arquivo_url) {
        console.log('🗑️ Deletando arquivo do storage:', documentToDelete.arquivo_url);
        try {
          await supabase.storage
            .from('documentos_fiscais')
            .remove([documentToDelete.arquivo_url]);
          console.log('✅ Arquivo deletado do storage');
        } catch (storageError) {
          console.warn('⚠️ Erro ao deletar arquivo do storage (continuando):', storageError);
        }
      }
      
      const { error: deleteError } = await supabase
        .from('documentos_admin')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('❌ Erro ao excluir documento:', deleteError);
        throw new Error(`Erro ao excluir documento: ${deleteError.message}`);
      }

      console.log('✅ Documento excluído com sucesso');
      await fetchDocuments();
    } catch (err) {
      console.error('❌ Erro ao excluir documento:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (checkAdminAuth()) {
      console.log('📄 Iniciando carregamento automático de documentos...');
      fetchDocuments();
    } else {
      console.log('⏳ Aguardando sessão admin válida...');
      setLoading(false);
    }
  }, []);

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    checkAdminPermissions: checkAdminAuth
  };
};
