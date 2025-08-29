import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SignupSubmission {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  telefone: string;
  nome_responsavel: string;
  plano_selecionado: string;
  tipo_pessoa: string;
  status: string;
  processed_at: string | null;
  contratacao_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export const useAdminSignupSubmissions = () => {
  const [submissions, setSubmissions] = useState<SignupSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('signup_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar submissions:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar solicitações de cadastro",
          variant: "destructive",
        });
        return;
      }

      setSubmissions(data as SignupSubmission[] || []);
    } catch (error) {
      console.error('Erro na busca de submissions:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar solicitações de cadastro",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processSubmission = async (submissionId: string) => {
    try {
      setProcessing(submissionId);
      
      const { data, error } = await supabase.rpc('process_signup_submission', {
        p_submission_id: submissionId
      });

      if (error) {
        console.error('Erro ao processar submission:', error);
        toast({
          title: "Erro",
          description: "Erro ao processar solicitação",
          variant: "destructive",
        });
        return false;
      }

      const result = data as { success: boolean; contract_id?: string; error?: string; message?: string };

      if (!result.success) {
        toast({
          title: "Erro",
          description: result.error || "Erro ao processar solicitação",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: result.message || "Solicitação processada com sucesso",
      });

      // Refresh submissions list
      await fetchSubmissions();
      return true;

    } catch (error) {
      console.error('Erro no processamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação",
        variant: "destructive",
      });
      return false;
    } finally {
      setProcessing(null);
    }
  };

  const deleteSubmission = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('signup_submissions')
        .delete()
        .eq('id', submissionId);

      if (error) {
        console.error('Erro ao deletar submission:', error);
        toast({
          title: "Erro",
          description: "Erro ao deletar solicitação",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Solicitação removida com sucesso",
      });

      await fetchSubmissions();
      return true;

    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar solicitação",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  return {
    submissions,
    loading,
    processing,
    fetchSubmissions,
    processSubmission,
    deleteSubmission,
  };
};