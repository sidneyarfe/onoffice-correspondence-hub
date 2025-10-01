import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ClientFormData {
  id?: string;
  plano_selecionado: string;
  tipo_pessoa: string;
  nome_responsavel: string;
  email: string;
  telefone: string;
  cpf_responsavel: string;
  cnpj?: string;
  razao_social?: string;
  endereco: string;
  numero_endereco: string;
  complemento_endereco?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  cep: string;
  status_contratacao: string;
  plano_id?: string;
  produto_id?: string;
  preco?: number;
  produto_selecionado?: string;
  ultimo_pagamento?: string;
  proximo_vencimento?: string;
}

export const useClientManagement = () => {
  const [loading, setLoading] = useState(false);

  const createClient = async (clientData: ClientFormData) => {
    setLoading(true);
    
    try {
      console.log('Criando novo cliente via webhook n8n:', clientData);

      // Validar plano selecionado
      const planosValidos = ['1 ANO', '2 ANOS', '1 MES'];
      if (!planosValidos.includes(clientData.plano_selecionado)) {
        throw new Error('Plano selecionado inválido');
      }

      // Validar tipo de pessoa
      const tiposValidos = ['fisica', 'juridica'];
      if (!tiposValidos.includes(clientData.tipo_pessoa)) {
        throw new Error('Tipo de pessoa inválido');
      }

      // Validar status de contratação
      const statusValidos = ['INICIADO', 'CONTRATO_ENVIADO', 'CONTRATO_ASSINADO', 'PAGAMENTO_PENDENTE', 'PAGAMENTO_CONFIRMADO', 'ATIVO', 'SUSPENSO', 'CANCELADO'];
      if (!statusValidos.includes(clientData.status_contratacao)) {
        throw new Error('Status de contratação inválido');
      }

      // Preparar dados para o webhook n8n - apenas campos preenchidos
      const webhookData: any = {
        id: crypto.randomUUID(), // Gerar um ID único para o processo
        plano_selecionado: clientData.plano_selecionado,
        tipo_pessoa: clientData.tipo_pessoa,
        email: clientData.email,
        telefone: clientData.telefone,
        nome_responsavel: clientData.nome_responsavel,
        cpf_responsavel: clientData.cpf_responsavel,
        endereco: clientData.endereco,
        numero_endereco: clientData.numero_endereco,
        cidade: clientData.cidade,
        estado: clientData.estado,
        cep: clientData.cep,
        status_contratacao: clientData.status_contratacao,
        zapsign_document_token: '',
        zapsign_template_id: '',
        pagarme_customer_id: '',
        pagarme_payment_id: '',
        pagarme_payment_link: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Adicionar IDs de plano e produto se fornecidos
      if (clientData.plano_id) {
        webhookData.plano_id = clientData.plano_id;
      }
      
      if (clientData.produto_id) {
        webhookData.produto_id = clientData.produto_id;
      }

      // Adicionar preço se fornecido
      if (clientData.preco) {
        webhookData.preco = clientData.preco;
      }

      // Adicionar nome do produto se fornecido
      if (clientData.produto_selecionado) {
        webhookData.produto_selecionado = clientData.produto_selecionado;
      }

      // Adicionar datas de pagamento se fornecidas
      if (clientData.ultimo_pagamento) {
        webhookData.ultimo_pagamento = clientData.ultimo_pagamento;
      }

      if (clientData.proximo_vencimento) {
        webhookData.proximo_vencimento = clientData.proximo_vencimento;
      }

      // Adicionar campos opcionais apenas se tiverem valor
      if (clientData.razao_social && clientData.razao_social.trim()) {
        webhookData.razao_social = clientData.razao_social;
      }
      
      if (clientData.cnpj && clientData.cnpj.trim()) {
        webhookData.cnpj = clientData.cnpj;
      }
      
      if (clientData.complemento_endereco && clientData.complemento_endereco.trim()) {
        webhookData.complemento_endereco = clientData.complemento_endereco;
      }
      
      if (clientData.bairro && clientData.bairro.trim()) {
        webhookData.bairro = clientData.bairro;
      }

      console.log('Enviando dados para webhook n8n:', webhookData);

      // Enviar para o webhook do n8n
      const webhookUrl = 'https://sidneyarfe.app.n8n.cloud/webhook/7dd7b139-983a-4cd2-b4ee-224f028b2983';
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        throw new Error(`Erro no webhook n8n: ${response.status} - ${response.statusText}`);
      }

      const webhookResult = await response.text();
      console.log('Resposta do webhook n8n:', webhookResult);

      toast({
        title: "Cliente criado com sucesso!",
        description: `Cliente ${clientData.nome_responsavel} foi enviado para processamento. O login e senha temporária serão gerados automaticamente.`,
      });

      return { success: true };

    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      
      toast({
        title: "Erro ao criar cliente",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });

      return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (clientId: string, clientData: Partial<ClientFormData>) => {
    setLoading(true);
    
    try {
      console.log('Atualizando cliente:', clientId, clientData);

      // Validar plano selecionado se estiver sendo atualizado
      if (clientData.plano_selecionado) {
        const planosValidos = ['1 ANO', '2 ANOS', '1 MES'];
        if (!planosValidos.includes(clientData.plano_selecionado)) {
          throw new Error('Plano selecionado inválido');
        }
      }

      // Validar tipo de pessoa se estiver sendo atualizado
      if (clientData.tipo_pessoa) {
        const tiposValidos = ['fisica', 'juridica'];
        if (!tiposValidos.includes(clientData.tipo_pessoa)) {
          throw new Error('Tipo de pessoa inválido');
        }
      }

      // Validar status de contratação se estiver sendo atualizado
      if (clientData.status_contratacao) {
        const statusValidos = ['INICIADO', 'CONTRATO_ENVIADO', 'CONTRATO_ASSINADO', 'PAGAMENTO_PENDENTE', 'PAGAMENTO_CONFIRMADO', 'ATIVO', 'SUSPENSO', 'CANCELADO'];
        if (!statusValidos.includes(clientData.status_contratacao)) {
          throw new Error('Status de contratação inválido');
        }
      }

      const { error } = await supabase
        .from('contratacoes_clientes')
        .update(clientData)
        .eq('id', clientId);

      if (error) {
        console.error('Erro ao atualizar cliente:', error);
        throw new Error(error.message);
      }

      toast({
        title: "Cliente atualizado com sucesso!",
        description: "Os dados do cliente foram atualizados.",
      });

      return { success: true };

    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      
      toast({
        title: "Erro ao atualizar cliente",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });

      return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (clientId: string) => {
    setLoading(true);
    
    try {
      console.log('Deletando cliente:', clientId);

      // Primeiro, buscar o user_id da contratação
      const { data: contratacao, error: fetchError } = await supabase
        .from('contratacoes_clientes')
        .select('user_id')
        .eq('id', clientId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar contratação:', fetchError);
        throw new Error(fetchError.message);
      }

      // Deletar a contratação
      const { error: contratacaoError } = await supabase
        .from('contratacoes_clientes')
        .delete()
        .eq('id', clientId);

      if (contratacaoError) {
        console.error('Erro ao deletar contratação:', contratacaoError);
        throw new Error(contratacaoError.message);
      }

      // Se tiver user_id, tentar deletar o perfil do usuário
      if (contratacao?.user_id) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', contratacao.user_id);

          if (profileError) {
            console.log('Aviso: Não foi possível deletar o perfil:', profileError.message);
          }
        } catch (profileErr) {
          console.log('Aviso: Erro ao deletar perfil do usuário:', profileErr);
        }
      }

      toast({
        title: "Cliente deletado com sucesso!",
        description: "O cliente foi removido do sistema.",
      });

      return { success: true };

    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      
      toast({
        title: "Erro ao deletar cliente",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });

      return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
    } finally {
      setLoading(false);
    }
  };

  return {
    createClient,
    updateClient,
    deleteClient,
    loading
  };
};
