
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAdminDocuments, AdminDocument } from '@/hooks/useAdminDocuments';
import { supabase } from '@/integrations/supabase/client';

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
        console.log('Autenticando admin no Supabase para upload...');
        await supabase.auth.signInWithPassword({
          email: 'onoffice1893@gmail.com',
          password: 'GBservice2085'
        });
      }
    } catch (authError) {
      console.warn('Aviso: Erro na autenticação Supabase:', authError);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      if (!checkAdminAuth()) {
        throw new Error('Sessão admin não encontrada');
      }

      await ensureSupabaseAuth();
      
      setUploadProgress(10);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      console.log('📤 Fazendo upload do arquivo:', fileName);
      setUploadProgress(50);

      const { data, error } = await supabase.storage
        .from('documentos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        throw error;
      }

      setUploadProgress(100);
      console.log('✅ Upload concluído:', data.path);
      return data.path;
    } catch (error) {
      console.error('❌ Erro ao fazer upload:', error);
      setUploadProgress(0);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📋 Iniciando submissão do formulário...');
    
    if (!formData.tipo || !formData.nome) {
      toast({
        title: "Erro",
        description: "Tipo e nome são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!checkAdminAuth()) {
      toast({
        title: "Erro",
        description: "Sessão admin não encontrada. Faça login novamente.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let arquivo_url = document?.arquivo_url || null;

      // Fazer upload do arquivo se um foi selecionado
      if (selectedFile) {
        console.log('📤 Fazendo upload do arquivo...');
        arquivo_url = await uploadFile(selectedFile);
        console.log('✅ Arquivo enviado para:', arquivo_url);
      }

      const documentData = {
        ...formData,
        arquivo_url
      };

      console.log('💾 Salvando documento:', documentData);

      if (document) {
        await updateDocument(document.id, documentData);
        console.log('✅ Documento atualizado com sucesso');
        toast({
          title: "Sucesso",
          description: "Documento atualizado com sucesso"
        });
      } else {
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
      console.error('❌ Erro detalhado ao salvar documento:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar documento';
      
      toast({
        title: "Erro",
        description: errorMessage,
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
