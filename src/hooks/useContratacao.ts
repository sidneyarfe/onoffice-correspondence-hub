
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useUserCreation } from './useUserCreation';
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
  const { createUserAccount } = useUserCreation();

  const processarContratacao = async (dados: ContratacaoData) => {
    setLoading(true);
    
    const N8N_WEBHOOK_URL = 'https://sidneyarfe.app.n8n.cloud/webhook/27403522-4155-4a85-a2fa-607ff38b8ea4';

    try {
      console.log('Iniciando processo de contratação:', dados);
      
      // Passo 1: Criar usuário no Supabase Auth
      console.log('Criando conta de usuário...');
      const userResult = await createUserAccount({
        email: dados.email,
        nome_responsavel: dados.nome_responsavel
      });

      console.log('Usuário criado:', userResult);

      // Passo 2: Inserir dados da contratação diretamente no Supabase com user_id
      console.log('Salvando dados da contratação no Supabase...');
      const { data: contratacao, error: dbError } = await supabase
        .from('contratacoes_clientes')
        .insert({
          ...dados,
          user_id: userResult.user_id, // Vinculando o usuário à contratação
          status_contratacao: 'INICIADO'
        })
        .select()
        .single();

      if (dbError) {
        console.error('Erro ao salvar contratação no Supabase:', dbError);
        throw new Error(`Erro ao salvar contratação: ${dbError.message}`);
      }

      console.log('Contratação salva com sucesso:', contratacao.id);

      // Passo 3: Preparar dados para envio ao n8n (incluindo IDs)
      const contratacaoComUser = {
        ...dados,
        user_id: userResult.user_id,
        temporary_password: userResult.temporary_password,
        contratacao_id: contratacao.id // Incluir o ID da contratação
      };

      console.log('Enviando dados para o n8n:', { ...contratacaoComUser, temporary_password: '[REDACTED]' });
      
      // Passo 4: Enviar para o n8n
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contratacaoComUser),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido na comunicação com o n8n' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const result = await response.json();

      toast({
        title: "Sucesso! 🎉",
        description: "Sua conta foi criada e seu contrato está sendo preparado. Você será redirecionado em instantes.",
      });

      return {
        ...result,
        id: contratacao.id, // Retornar o ID da contratação
        user_id: userResult.user_id,
        user_email: userResult.email,
        temporary_password: userResult.temporary_password
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
