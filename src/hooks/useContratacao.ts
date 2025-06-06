
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { API_ENDPOINTS, callEdgeFunction } from '@/lib/api';

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
      console.log('Enviando dados para processamento:', dados);
      
      const result = await callEdgeFunction(API_ENDPOINTS.processarContratacao, dados);
      
      toast({
        title: "Sucesso! 🎉",
        description: "Contrato enviado para seu email. Verifique sua caixa de entrada para assinar.",
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
