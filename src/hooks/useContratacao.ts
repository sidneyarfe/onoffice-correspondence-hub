
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

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

interface SelectedPlan {
  id: string;
  produto_id: string;
  nome_plano: string;
  preco_em_centavos: number;
  produtos?: {
    nome_produto: string;
  };
}

export const useContratacao = () => {
  const [loading, setLoading] = useState(false);

  const processarContratacao = async (dados: ContratacaoData, selectedPlan?: SelectedPlan) => {
    setLoading(true);

    try {
      console.log('Enviando dados para o n8n:', dados);
      
      // Enviar dados para o n8n webhook - n8n será responsável por tudo
      const webhookData = {
        // Campos estruturados do plano (se disponível)
        ...(selectedPlan && {
          plano_id: selectedPlan.id,
          produto_id: selectedPlan.produto_id,
          preco: selectedPlan.preco_em_centavos,
          produto_selecionado: selectedPlan.produtos?.nome_produto || '',
        }),
        // Dados do formulário
        ...dados,
        status_contratacao: 'INICIADO',
        created_at: new Date().toISOString()
      };

      const webhookResponse = await fetch('https://sidneyarfe.app.n8n.cloud/webhook/27403522-4155-4a85-a2fa-607ff38b8ea4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (!webhookResponse.ok) {
        console.error('Erro ao enviar para o n8n:', webhookResponse.status);
        throw new Error('Erro ao enviar dados para processamento');
      }

      console.log('Dados enviados para o n8n com sucesso');

      toast({
        title: "Sucesso! 🎉",
        description: "Sua contratação foi enviada e está sendo processada.",
      });

      return {
        success: true
      };
      
    } catch (error) {
      console.error('Erro no envio:', error);
      
      toast({
        title: "Erro na contratação",
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
