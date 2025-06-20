
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
      console.log('Iniciando processo de contratação:', dados);
      
      // Passo 1: Inserir dados da contratação no Supabase SEM user_id
      console.log('Salvando dados da contratação no Supabase...');
      const { data: contratacao, error: dbError } = await supabase
        .from('contratacoes_clientes')
        .insert({
          ...dados,
          user_id: null, // Será preenchido pelo n8n após criar o usuário
          status_contratacao: 'INICIADO'
        })
        .select()
        .single();

      if (dbError) {
        console.error('Erro ao salvar contratação no Supabase:', dbError);
        throw new Error(`Erro ao salvar contratação: ${dbError.message}`);
      }

      console.log('Contratação salva com sucesso:', contratacao.id);

      // Passo 2: Enviar dados para o n8n webhook
      console.log('Enviando dados para o n8n...');
      const webhookData = {
        ...dados,
        contratacao_id: contratacao.id,
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
      } else {
        console.log('Dados enviados para o n8n com sucesso');
      }

      toast({
        title: "Sucesso! 🎉",
        description: "Sua contratação foi registrada e está sendo processada.",
      });

      return {
        id: contratacao.id,
        success: true
      };
      
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
