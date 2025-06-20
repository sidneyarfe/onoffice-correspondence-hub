
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

      // Passo 3: Enviar dados para o n8n webhook
      console.log('Enviando dados para o n8n...');
      const webhookData = {
        ...dados,
        contratacao_id: contratacao.id,
        user_id: userResult.user_id,
        user_email: userResult.email,
        temporary_password: userResult.temporary_password,
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
        // Não vamos falhar o processo todo se o webhook falhar
        console.log('Contratação salva no Supabase, mas webhook falhou');
      } else {
        console.log('Dados enviados para o n8n com sucesso');
      }

      toast({
        title: "Sucesso! 🎉",
        description: "Sua conta foi criada e sua contratação foi registrada. O processamento continuará automaticamente.",
      });

      return {
        id: contratacao.id,
        user_id: userResult.user_id,
        user_email: userResult.email,
        temporary_password: userResult.temporary_password,
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
