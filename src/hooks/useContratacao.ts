
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
      console.log('=== ENVIANDO DIRETO PARA N8N ===');
      console.log('Dados recebidos do formulário:', dados);
      
      // Limpar e preparar dados
      const contratacaoData = cleanContratacaoData(dados);
      console.log('Dados limpos para envio:', contratacaoData);
      
      console.log('Tipo de pessoa:', contratacaoData.tipo_pessoa);
      if (contratacaoData.tipo_pessoa === 'juridica') {
        console.log('Dados PJ - Razão Social:', contratacaoData.razao_social, 'CNPJ:', contratacaoData.cnpj);
      }

      // Enviar diretamente para o webhook do N8n
      const n8nWebhookUrl = 'https://sidneyarfe.app.n8n.cloud/webhook-test/27403522-4155-4a85-a2fa-607ff38b8ea4';
      
      console.log('Enviando para N8n:', contratacaoData);

      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contratacaoData),
      });

      if (!response.ok) {
        console.error('N8n webhook falhou:', response.status, await response.text());
        throw new Error('Erro ao enviar dados. Tente novamente.');
      }

      console.log('N8n webhook enviado com sucesso');

      toast({
        title: "Sucesso! 🎉",
        description: "Sua solicitação foi enviada e está sendo processada. Entraremos em contato em breve.",
      });

      return {
        success: true,
        submissionId: 'n8n-sent'
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
