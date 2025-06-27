
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user, session } = useAuth();

  // Função para verificar admin usando localStorage (consistente com outros módulos)
  const checkAdminAuth = () => {
    try {
      const adminSession = localStorage.getItem('onoffice_admin_session');
      if (!adminSession) return false;

      const session = JSON.parse(adminSession);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      return session.isAdmin && (Date.now() - session.timestamp <= TWENTY_FOUR_HOURS);
    } catch {
      return false;
    }
  };

  const ensureSupabaseAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('Autenticando admin no Supabase...');
        await supabase.auth.signInWithPassword({
          email: 'onoffice1893@gmail.com',
          password: 'GBservice2085'
        });
      }
    } catch (authError) {
      console.warn('Aviso: Erro na autenticação Supabase:', authError);
      // Continue mesmo com erro - as políticas RLS foram ajustadas
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📄 Iniciando busca de documentos admin...');
      
      if (!checkAdminAuth()) {
        console.error('Não autenticado como admin');
        setError('Sessão admin não encontrada');
        setLoading(false);
        return;
      }

      // Garantir autenticação no Supabase
      await ensureSupabaseAuth();

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
      
      // Verificar autenticação admin local
      if (!checkAdminAuth()) {
        throw new Error('Sessão admin não encontrada');
      }

      // Garantir autenticação no Supabase
      await ensureSupabaseAuth();
      
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
      await fetchDocuments(); // Recarregar a lista
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

      await ensureSupabaseAuth();
      
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
      await fetchDocuments(); // Recarregar a lista
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

      await ensureSupabaseAuth();
      
      const { error: deleteError } = await supabase
        .from('documentos_admin')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('❌ Erro ao excluir documento:', deleteError);
        throw new Error(`Erro ao excluir documento: ${deleteError.message}`);
      }

      console.log('✅ Documento excluído com sucesso');
      await fetchDocuments(); // Recarregar a lista
    } catch (err) {
      console.error('❌ Erro ao excluir documento:', err);
      throw err;
    }
  };

  useEffect(() => {
    // Buscar documentos se há sessão admin válida
    if (checkAdminAuth()) {
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
