
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ContratacaoData {
  plano_selecionado: string;
  tipo_pessoa: 'fisica' | 'juridica';
  email: string;
  telefone: string;
  nome_responsavel: string;
  cpf_responsavel: string;
  razao_social?: string;
  cnpj?: string;
  endereco: string;
  numero_endereco: string;
  complemento_endereco?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  cep: string;
}

export const useContratacao = () => {
  const [loading, setLoading] = useState(false);

  const processarContratacao = async (dados: ContratacaoData) => {
    setLoading(true);

    try {
      console.log('Submetendo signup seguro:', dados);
      
      // Get client IP and user agent for security tracking
      const clientInfo = {
        ip_address: null, // Will be set by RLS/triggers if needed
        user_agent: navigator.userAgent
      };
      
      // Submit to secure signup_submissions table
      const submissionData = {
        email: dados.email,
        telefone: dados.telefone,
        nome_responsavel: dados.nome_responsavel,
        cpf_responsavel: dados.cpf_responsavel,
        plano_selecionado: dados.plano_selecionado,
        tipo_pessoa: dados.tipo_pessoa,
        razao_social: dados.razao_social,
        cnpj: dados.cnpj,
        endereco: dados.endereco,
        numero_endereco: dados.numero_endereco,
        complemento_endereco: dados.complemento_endereco,
        bairro: dados.bairro,
        cidade: dados.cidade,
        estado: dados.estado,
        cep: dados.cep,
        user_agent: clientInfo.user_agent
      };

      const { data, error } = await supabase
        .from('signup_submissions')
        .insert([submissionData])
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar submission:', error);
        throw new Error('Erro ao processar sua solicitação. Tente novamente.');
      }

      console.log('Submission salva com sucesso:', data);

      toast({
        title: "Sucesso! 🎉",
        description: "Sua solicitação foi enviada e está sendo processada. Entraremos em contato em breve.",
      });

      return {
        success: true,
        submissionId: data.id
      };
      
    } catch (error) {
      console.error('Erro no processamento:', error);
      
      toast({
        title: "Erro na solicitação",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    processarContratacao,
    loading,
  };
};
