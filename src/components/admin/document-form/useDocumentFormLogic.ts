
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAdminDocuments, AdminDocument } from '@/hooks/useAdminDocuments';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUser } from '@/utils/adminEmails';

interface DocumentFormData {
  tipo: string;
  nome: string;
  descricao: string;
  disponivel_por_padrao: boolean;
}

export const useDocumentFormLogic = (
  document: AdminDocument | null | undefined,
  onSuccess: () => void,
  onClose: () => void
) => {
  const [formData, setFormData] = useState<DocumentFormData>({
    tipo: document?.tipo || '',
    nome: document?.nome || '',
    descricao: document?.descricao || '',
    disponivel_por_padrao: document?.disponivel_por_padrao ?? true
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { createDocument, updateDocument } = useAdminDocuments();
  const { user } = useAuth();

  const isAdmin = () => isAdminUser(user);

  const resetForm = () => {
    if (document) {
      setFormData({
        tipo: document.tipo,
        nome: document.nome,
        descricao: document.descricao || '',
        disponivel_por_padrao: document.disponivel_por_padrao
      });
    } else {
      setFormData({
        tipo: '',
        nome: '',
        descricao: '',
        disponivel_por_padrao: true
      });
    }
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      console.log('📤 Iniciando upload do arquivo:', file.name);
      
      if (!isAdmin()) {
        throw new Error('Usuário não é admin');
      }

      setUploadProgress(10);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      console.log('📤 Nome do arquivo gerado:', fileName);
      setUploadProgress(50);

      const { data, error } = await supabase.storage
        .from('documentos_fiscais')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Erro detalhado no upload:', {
          error,
          message: error.message
        });
        throw error;
      }

      setUploadProgress(100);
      console.log('✅ Upload concluído com sucesso:', data.path);
      return data.path;
    } catch (error) {
      console.error('❌ Erro completo no upload:', error);
      setUploadProgress(0);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📋 Iniciando submissão do formulário...', formData);
    
    if (!formData.tipo || !formData.nome) {
      console.error('📋 Dados obrigatórios faltando:', { tipo: formData.tipo, nome: formData.nome });
      toast({
        title: "Erro",
        description: "Tipo e nome são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!isAdmin()) {
      toast({
        title: "Erro",
        description: "Usuário não é admin. Faça login novamente.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      let arquivo_url = document?.arquivo_url || null;

      // Fazer upload do arquivo se um foi selecionado
      if (selectedFile) {
        console.log('📤 Fazendo upload do novo arquivo...');
        arquivo_url = await uploadFile(selectedFile);
        console.log('✅ Arquivo enviado para:', arquivo_url);
      }

      const documentData = {
        ...formData,
        arquivo_url
      };

      console.log('💾 Dados finais para salvar:', documentData);

      if (document) {
        console.log('✏️ Atualizando documento existente:', document.id);
        await updateDocument(document.id, documentData);
        console.log('✅ Documento atualizado com sucesso');
        toast({
          title: "Sucesso",
          description: "Documento atualizado com sucesso"
        });
      } else {
        console.log('➕ Criando novo documento');
        await createDocument(documentData);
        console.log('✅ Documento criado com sucesso');
        toast({
          title: "Sucesso",
          description: "Documento criado com sucesso"
        });
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Erro detalhado ao salvar documento:', {
        error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar documento';
      
      toast({
        title: "Erro",
        description: `Falha ao salvar: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return {
    formData,
    setFormData,
    selectedFile,
    setSelectedFile,
    loading,
    uploadProgress,
    handleSubmit,
    resetForm
  };
};
