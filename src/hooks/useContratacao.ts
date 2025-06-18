
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

// A função callEdgeFunction foi removida pois a chamada será direta.

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
    
    // *** ALTERAÇÃO PRINCIPAL: Apontar para o Webhook do n8n ***
    const N8N_WEBHOOK_URL = 'https://sidneyarfe.app.n8n.cloud/webhook/27403522-4155-4a85-a2fa-607ff38b8ea4';

    try {
      console.log('Enviando dados para o n8n:', dados);
      
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido na comunicação com o n8n' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const result = await response.json();

      toast({
        title: "Sucesso! 🎉",
        description: "Seu contrato está sendo preparado. Você será redirecionado em instantes.",
      });

      return result;
      
    } catch (error) {
      console.error('Erro na contratação:', error);
      
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
