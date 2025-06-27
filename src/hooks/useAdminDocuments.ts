
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

  // Função para verificar se o usuário é admin
  const checkAdminPermissions = async (): Promise<boolean> => {
    try {
      if (!user || !session) {
        console.log('❌ Usuário não autenticado');
        return false;
      }

      console.log('✅ Verificando permissões admin para:', user.email);
      
      // Verificar se o usuário tem tipo admin
      if (user.type === 'admin') {
        console.log('✅ Usuário é admin por tipo');
        return true;
      }

      // Chamar função do banco para verificar
      const { data, error } = await supabase.rpc('is_admin_user');
      
      if (error) {
        console.error('❌ Erro ao verificar permissões admin:', error);
        return false;
      }

      console.log('✅ Resultado da verificação admin:', data);
      return data === true;
    } catch (err) {
      console.error('❌ Erro geral ao verificar permissões:', err);
      return false;
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📄 Iniciando busca de documentos...');
      
      // Verificar permissões antes de buscar
      const hasPermission = await checkAdminPermissions();
      if (!hasPermission) {
        setError('Você não tem permissão para acessar os documentos');
        setDocuments([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('documentos_admin')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Erro ao buscar documentos:', fetchError);
        
        // Tratamento específico para erros de RLS
        if (fetchError.code === 'PGRST301' || fetchError.message?.includes('row-level security')) {
          setError('Erro de permissão: Verifique se você está logado como administrador');
        } else {
          setError(`Erro ao buscar documentos: ${fetchError.message}`);
        }
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
      
      // Verificar permissões antes de criar
      const hasPermission = await checkAdminPermissions();
      if (!hasPermission) {
        throw new Error('Você não tem permissão para criar documentos');
      }

      // Verificar se o usuário está autenticado
      if (!user || !session) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      console.log('✅ Permissões verificadas, criando documento...');
      
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
        
        // Tratamento específico para diferentes tipos de erro
        if (createError.code === 'PGRST301' || createError.message?.includes('row-level security')) {
          throw new Error('Erro de permissão: Verifique se você tem permissões de administrador');
        } else if (createError.code === '23505') {
          throw new Error('Já existe um documento com esse tipo');
        } else {
          throw new Error(`Erro ao criar documento: ${createError.message}`);
        }
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
      
      // Verificar permissões antes de atualizar
      const hasPermission = await checkAdminPermissions();
      if (!hasPermission) {
        throw new Error('Você não tem permissão para atualizar documentos');
      }

      const { data, error: updateError } = await supabase
        .from('documentos_admin')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erro ao atualizar documento:', updateError);
        
        if (updateError.code === 'PGRST301' || updateError.message?.includes('row-level security')) {
          throw new Error('Erro de permissão: Verifique se você tem permissões de administrador');
        } else {
          throw new Error(`Erro ao atualizar documento: ${updateError.message}`);
        }
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
      
      // Verificar permissões antes de excluir
      const hasPermission = await checkAdminPermissions();
      if (!hasPermission) {
        throw new Error('Você não tem permissão para excluir documentos');
      }

      const { error: deleteError } = await supabase
        .from('documentos_admin')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('❌ Erro ao excluir documento:', deleteError);
        
        if (deleteError.code === 'PGRST301' || deleteError.message?.includes('row-level security')) {
          throw new Error('Erro de permissão: Verifique se você tem permissões de administrador');
        } else {
          throw new Error(`Erro ao excluir documento: ${deleteError.message}`);
        }
      }

      console.log('✅ Documento excluído com sucesso');
      await fetchDocuments(); // Recarregar a lista
    } catch (err) {
      console.error('❌ Erro ao excluir documento:', err);
      throw err;
    }
  };

  useEffect(() => {
    // Só tentar buscar documentos se houver usuário autenticado
    if (user && session) {
      fetchDocuments();
    } else {
      console.log('⏳ Aguardando autenticação do usuário...');
      setLoading(false);
    }
  }, [user, session]);

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    checkAdminPermissions
  };
};
