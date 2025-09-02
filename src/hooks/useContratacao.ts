
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

  // Função para limpar dados e converter undefined para null
  const cleanContratacaoData = (dados: ContratacaoData) => {
    const cleaned: any = {};
    
    // Campos obrigatórios - sempre incluir
    cleaned.email = dados.email || null;
    cleaned.telefone = dados.telefone || null;
    cleaned.nome_responsavel = dados.nome_responsavel || null;
    cleaned.cpf_responsavel = dados.cpf_responsavel || null;
    cleaned.plano_selecionado = dados.plano_selecionado || null;
    cleaned.tipo_pessoa = dados.tipo_pessoa || null;
    cleaned.endereco = dados.endereco || null;
    cleaned.numero_endereco = dados.numero_endereco || null;
    cleaned.cidade = dados.cidade || null;
    cleaned.estado = dados.estado || null;
    cleaned.cep = dados.cep || null;
    cleaned.status_contratacao = 'INICIADO';

    // Campos opcionais - só incluir se tiverem valor válido
    if (dados.razao_social && dados.razao_social.trim() !== '') {
      cleaned.razao_social = dados.razao_social;
    } else {
      cleaned.razao_social = null;
    }

    if (dados.cnpj && dados.cnpj.trim() !== '') {
      cleaned.cnpj = dados.cnpj;
    } else {
      cleaned.cnpj = null;
    }

    if (dados.complemento_endereco && dados.complemento_endereco.trim() !== '') {
      cleaned.complemento_endereco = dados.complemento_endereco;
    } else {
      cleaned.complemento_endereco = null;
    }

    if (dados.bairro && dados.bairro.trim() !== '') {
      cleaned.bairro = dados.bairro;
    } else {
      cleaned.bairro = null;
    }

    return cleaned;
  };

  const processarContratacao = async (dados: ContratacaoData) => {
    setLoading(true);

    try {
      console.log('=== INÍCIO DO PROCESSAMENTO ===');
      console.log('Dados recebidos do formulário:', dados);
      
      // Limpar e preparar dados para inserção
      const contratacaoData = cleanContratacaoData(dados);
      console.log('Dados limpos para inserção:', contratacaoData);
      
      console.log('Tipo de pessoa:', contratacaoData.tipo_pessoa);
      if (contratacaoData.tipo_pessoa === 'juridica') {
        console.log('Dados PJ - Razão Social:', contratacaoData.razao_social, 'CNPJ:', contratacaoData.cnpj);
      }

      const { data, error } = await supabase
        .from('contratacoes_clientes')
        .insert([contratacaoData])
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar submission:', error);
        throw new Error('Erro ao processar sua solicitação. Tente novamente.');
      }

      console.log('Submission salva com sucesso:', data);

      // Send to N8n webhook via edge function
      try {
        const { error: webhookError } = await supabase.functions.invoke('processar-contratacao', {
          body: { contratacao_id: data.id }
        });

        if (webhookError) {
          console.error('Erro ao enviar para N8n:', webhookError);
          // Don't throw error, just log it - submission was saved successfully
        } else {
          console.log('Dados enviados para N8n com sucesso');
        }
      } catch (webhookError) {
        console.error('Erro na chamada do webhook N8n:', webhookError);
        // Don't throw error, just log it - submission was saved successfully
      }

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
