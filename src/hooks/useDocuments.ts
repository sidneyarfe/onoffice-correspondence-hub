
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Document {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
}

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAdminAuth = () => {
    try {
      // Verificar sessão admin no localStorage (igual às correspondências)
      const adminSession = localStorage.getItem('onoffice_admin_session');
      if (!adminSession) return false;

      const session = JSON.parse(adminSession);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      return session.isAdmin && (Date.now() - session.timestamp <= TWENTY_FOUR_HOURS);
    } catch {
      return false;
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('=== BUSCANDO DOCUMENTOS ===');
      
      if (!checkAdminAuth()) {
        console.error('Não autenticado como admin');
        setError('Sessão admin não encontrada');
        setLoading(false);
        return;
      }

      // Tentar autenticar com Supabase usando email admin
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Se não há usuário Supabase, tentar login silencioso com credenciais admin
          console.log('Tentando autenticação admin no Supabase...');
          await supabase.auth.signInWithPassword({
            email: 'onoffice1893@gmail.com',
            password: 'GBservice2085'
          });
        }
      } catch (authError) {
        console.warn('Erro na autenticação Supabase:', authError);
        // Continue mesmo com erro de auth para testar as políticas
      }

      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Erro ao buscar documentos:', fetchError);
        setError(`Erro ao buscar documentos: ${fetchError.message}`);
        setDocuments([]);
        return;
      }

      console.log(`${data?.length || 0} documentos encontrados`);
      setDocuments(data || []);
    } catch (err) {
      console.error('Erro geral ao buscar documentos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    console.log('📤 Fazendo upload do arquivo:', fileName);

    const { data, error } = await supabase.storage
      .from('documentos_fiscais')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Erro no upload:', error);
      throw error;
    }

    console.log('✅ Upload concluído:', data.path);
    return data.path;
  };

  const createDocument = async (name: string, description: string, file: File) => {
    try {
      console.log('📝 Criando documento:', name);
      
      // Verificar autenticação admin
      if (!checkAdminAuth()) {
        throw new Error('Sessão admin não encontrada');
      }

      // Garantir autenticação no Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          await supabase.auth.signInWithPassword({
            email: 'onoffice1893@gmail.com',
            password: 'GBservice2085'
          });
        }
      } catch (authError) {
        console.warn('Aviso: Erro na autenticação Supabase, tentando continuar:', authError);
      }
      
      // Fazer upload do arquivo
      const filePath = await uploadFile(file);
      
      const { data, error } = await supabase
        .from('documents')
        .insert({
          name,
          description,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Documento criado com sucesso:', data);
      await fetchDocuments(); // Recarregar a lista
      return data;
    } catch (err) {
      console.error('Erro ao criar documento:', err);
      throw err;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      console.log('🗑️ Excluindo documento:', id);
      
      // Verificar autenticação admin
      if (!checkAdminAuth()) {
        throw new Error('Sessão admin não encontrada');
      }

      // Garantir autenticação no Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          await supabase.auth.signInWithPassword({
            email: 'onoffice1893@gmail.com',
            password: 'GBservice2085'
          });
        }
      } catch (authError) {
        console.warn('Aviso: Erro na autenticação Supabase, tentando continuar:', authError);
      }
      
      // Buscar o documento para obter o file_path
      const document = documents.find(d => d.id === id);
      
      // Deletar arquivo do storage se existir
      if (document?.file_path) {
        await supabase.storage
          .from('documentos_fiscais')
          .remove([document.file_path]);
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Documento excluído com sucesso');
      await fetchDocuments(); // Recarregar a lista
    } catch (err) {
      console.error('Erro ao deletar documento:', err);
      throw err;
    }
  };

  const getFileUrl = async (filePath: string) => {
    try {
      const { data } = supabase.storage
        .from('documentos_fiscais')
        .getPublicUrl(filePath);

      return data?.publicUrl || null;
    } catch (error) {
      console.error('Erro ao obter URL do arquivo:', error);
      return null;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    createDocument,
    deleteDocument,
    getFileUrl
  };
};
