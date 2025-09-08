
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();

  const isAdmin = () => {
    if (!user?.email) return false;
    
    return user.email === 'onoffice1893@gmail.com' || 
           user.email === 'contato@onofficebelem.com.br' ||
           user.email === 'sidneyferreira12205@gmail.com' ||
           user.email.includes('@onoffice.com') ||
           user.type === 'admin';
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('=== BUSCANDO DOCUMENTOS ===');
      
      if (!isAdmin()) {
        console.error('Não autenticado como admin');
        setError('Usuário não é admin');
        setLoading(false);
        return;
      }

      // Verificar se o usuário está autenticado
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser && !isAdmin()) {
        throw new Error('Acesso negado: usuário não autenticado');
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
      if (!isAdmin()) {
        throw new Error('Usuário não é admin');
      }

      // Verificar se o usuário está autenticado
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser && !isAdmin()) {
        throw new Error('Acesso negado: apenas administradores podem criar documentos');
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
      if (!isAdmin()) {
        throw new Error('Usuário não é admin');
      }

      // Verificar se o usuário está autenticado
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser && !isAdmin()) {
        throw new Error('Acesso negado: apenas administradores podem deletar documentos');
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
