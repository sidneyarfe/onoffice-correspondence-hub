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

      console.log('=== BUSCANDO DOCUMENTOS COMO ADMIN ===');
      
      // Verificar se há sessão admin válida
      const adminSession = localStorage.getItem('onoffice_admin_session');
      if (!adminSession) {
        console.error('Nenhuma sessão admin encontrada');
        setError('Sessão admin não encontrada');
        setLoading(false);
        return;
      }

      const session = JSON.parse(adminSession);
      if (!session.isAdmin) {
        console.error('Sessão não é de admin');
        setError('Sessão inválida');
        setLoading(false);
        return;
      }

      console.log('Sessão admin válida, buscando documentos...');
      
      const { data, error: fetchError } = await supabase
        .from('documentos_admin')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Resultado da busca de documentos:', { data, error: fetchError });

      if (fetchError) {
        console.error('Erro ao buscar documentos:', fetchError);
        setError(`Erro ao buscar documentos: ${fetchError.message}`);
        setDocuments([]);
      } else {
        setDocuments(data || []);
        console.log(`${data?.length || 0} documentos carregados`);
      }
    } catch (err) {
      console.error('Erro geral ao buscar documentos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar se o usuário atual é admin
  const checkAdminAuth = async () => {
    try {
      console.log('=== VERIFICANDO AUTENTICAÇÃO ADMIN ===');
      
      // Verificar se há sessão admin salva no localStorage
      const adminSession = localStorage.getItem('onoffice_admin_session');
      const adminUser = localStorage.getItem('onoffice_admin_user');
      
      if (adminSession && adminUser) {
        const session = JSON.parse(adminSession);
        const user = JSON.parse(adminUser);
        
        // Verificar se a sessão não expirou
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if (Date.now() - session.timestamp <= TWENTY_FOUR_HOURS) {
          console.log('✓ Sessão admin válida no localStorage:', user.email);
          return { isAdmin: true, adminId: user.id };
        }
      }
      
      console.log('Nenhuma sessão admin válida encontrada');
      return { isAdmin: false, adminId: null };
    } catch (error) {
      console.error('Erro na verificação de autenticação:', error);
      return { isAdmin: false, adminId: null };
    }
  };

  const uploadDocumentFile = async (file: File, tipo: string) => {
    console.log('=== INICIANDO UPLOAD ===');
    console.log('Arquivo:', file.name, 'Tipo:', tipo);
    
    try {
      // Verificar autenticação admin
      const { isAdmin, adminId } = await checkAdminAuth();
      if (!isAdmin || !adminId) {
        throw new Error('Usuário não autenticado como admin');
      }

      console.log('✓ Admin autenticado:', adminId);

      const fileExt = file.name.split('.').pop();
      const fileName = `${tipo}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log('Fazendo upload para:', filePath);

      const { data, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file);

      console.log('Resultado do upload:', { data, error: uploadError });

      if (uploadError) {
        console.error('Erro detalhado do upload:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      console.log('Upload realizado com sucesso:', data.path);
      return data.path;
    } catch (error) {
      console.error('Erro no uploadDocumentFile:', error);
      throw error;
    }
  };

  const deleteDocumentFile = async (filePath: string) => {
    try {
      console.log('Deletando arquivo:', filePath);
      
      const { error } = await supabase.storage
        .from('documentos')
        .remove([filePath]);

      if (error) {
        console.error('Erro ao deletar arquivo:', error);
        throw error;
      }
      
      console.log('Arquivo deletado com sucesso');
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      throw error;
    }
  };

  const createDocument = async (documentData: Omit<AdminDocument, 'id' | 'created_at' | 'updated_at'>) => {
    console.log('=== CRIANDO DOCUMENTO ===');
    console.log('Dados:', documentData);
    
    try {
      // Verificar autenticação admin
      const { isAdmin, adminId } = await checkAdminAuth();
      if (!isAdmin || !adminId) {
        throw new Error('Usuário não autenticado como admin');
      }

      console.log('✓ Admin autenticado para criar documento:', adminId);

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

      console.log('Resultado da criação:', { data, error: createError });

      if (createError) {
        console.error('Erro detalhado na criação:', createError);
        throw new Error(`Erro ao criar documento: ${createError.message}`);
      }
      
      setDocuments(prev => [data, ...prev]);
      console.log('Documento criado com sucesso:', data.id);
      return data;
    } catch (err) {
      console.error('Erro ao criar documento:', err);
      throw err;
    }
  };

  const updateDocument = async (id: string, updates: Partial<AdminDocument>) => {
    try {
      console.log('Atualizando documento:', id, updates);
      
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
      console.log('Excluindo documento:', id);
      
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
      console.log('Documento excluído com sucesso');
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
    // Adicionar um pequeno delay para permitir que o AuthContext termine de configurar
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
    updateDocument,
    deleteDocument,
    uploadDocumentFile,
    deleteDocumentFile,
    getPublicUrl,
    getClientDocumentAccess,
    updateClientDocumentAccess
  };
};
