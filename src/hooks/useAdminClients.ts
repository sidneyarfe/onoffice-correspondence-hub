import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminClient {
  id: string;
  user_id?: string;
  name: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  numero_endereco: string;
  complemento_endereco?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  cep: string;
  plan: string;
  status: 'active' | 'overdue' | 'suspended' | 'pending';
  joinDate: string;
  nextDue: string;
  correspondences: number;
  tipo_pessoa: string;
  cpf_responsavel: string;
  razao_social?: string;
}

export const useAdminClients = () => {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: contratacoes, error: contratError } = await supabase
        .from('contratacoes_clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (contratError) throw contratError;

      // Buscar contagem de correspondências para cada cliente
      const clientsData = await Promise.all(
        (contratacoes || []).map(async (contratacao) => {
          let correspondencesCount = 0;
          
          if (contratacao.user_id) {
            const { data: correspondencias } = await supabase
              .from('correspondencias')
              .select('id')
              .eq('user_id', contratacao.user_id);
            
            correspondencesCount = correspondencias?.length || 0;
          }

          // Calcular próximo vencimento
          const dataContratacao = new Date(contratacao.created_at);
          const proximoVencimento = calcularProximoVencimento(dataContratacao, contratacao.plano_selecionado);

          // Determinar status baseado no status_contratacao e data de vencimento
          let status: AdminClient['status'] = 'pending';
          
          switch (contratacao.status_contratacao) {
            case 'ATIVO':
              const hoje = new Date();
              status = proximoVencimento < hoje ? 'overdue' : 'active';
              break;
            case 'SUSPENSO':
              status = 'suspended';
              break;
            case 'PAGAMENTO_PENDENTE':
            case 'PAGAMENTO_CONFIRMADO':
              status = 'pending';
              break;
            default:
              status = 'pending';
          }

          // Endereço completo formatado
          const enderecoCompleto = `${contratacao.endereco}, ${contratacao.numero_endereco}${contratacao.complemento_endereco ? `, ${contratacao.complemento_endereco}` : ''}`;

          return {
            id: contratacao.id,
            user_id: contratacao.user_id,
            name: contratacao.razao_social || contratacao.nome_responsavel,
            cnpj: contratacao.cnpj || 'N/A',
            email: contratacao.email,
            telefone: contratacao.telefone,
            endereco: enderecoCompleto,
            numero_endereco: contratacao.numero_endereco,
            complemento_endereco: contratacao.complemento_endereco,
            bairro: contratacao.bairro,
            cidade: contratacao.cidade,
            estado: contratacao.estado,
            cep: contratacao.cep,
            plan: formatarNomePlano(contratacao.plano_selecionado),
            status,
            joinDate: new Date(contratacao.created_at).toLocaleDateString('pt-BR'),
            nextDue: proximoVencimento.toLocaleDateString('pt-BR'),
            correspondences: correspondencesCount,
            tipo_pessoa: contratacao.tipo_pessoa,
            cpf_responsavel: contratacao.cpf_responsavel,
            razao_social: contratacao.razao_social
          };
        })
      );

      setClients(clientsData);

    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const updateClientStatus = async (clientId: string, newStatus: AdminClient['status']) => {
    try {
      // Mapear status do frontend para o backend
      let dbStatus = 'ATIVO';
      switch (newStatus) {
        case 'active':
          dbStatus = 'ATIVO';
          break;
        case 'suspended':
          dbStatus = 'SUSPENSO';
          break;
        case 'overdue':
          dbStatus = 'ATIVO';
          break;
        case 'pending':
          dbStatus = 'PAGAMENTO_PENDENTE';
          break;
      }

      const { error } = await supabase
        .from('contratacoes_clientes')
        .update({ status_contratacao: dbStatus })
        .eq('id', clientId);

      if (error) throw error;

      // Atualizar o estado local
      setClients(prev => 
        prev.map(client => 
          client.id === clientId 
            ? { ...client, status: newStatus }
            : client
        )
      );

      return true;
    } catch (err) {
      console.error('Erro ao atualizar status do cliente:', err);
      throw err;
    }
  };

  const updateClient = async (clientId: string, formData: any) => {
    try {
      console.log('Atualizando cliente:', clientId, formData);
      
      const { error } = await supabase
        .from('contratacoes_clientes')
        .update({
          nome_responsavel: formData.nome_responsavel,
          razao_social: formData.razao_social || null,
          email: formData.email,
          telefone: formData.telefone,
          cpf_responsavel: formData.cpf_responsavel,
          cnpj: formData.cnpj || null,
          tipo_pessoa: formData.tipo_pessoa,
          endereco: formData.endereco,
          numero_endereco: formData.numero_endereco,
          complemento_endereco: formData.complemento_endereco || null,
          bairro: formData.bairro || null,
          cidade: formData.cidade,
          estado: formData.estado,
          cep: formData.cep,
          plano_selecionado: formData.plano_selecionado,
          status_contratacao: formData.status_contratacao,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);

      if (error) {
        console.error('Erro na atualização do banco:', error);
        throw error;
      }

      console.log('Cliente atualizado com sucesso no banco de dados');

      // Recarregar dados após atualização bem-sucedida
      await fetchClients();

      return true;
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      throw err;
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      console.log('Deletando cliente:', clientId);
      
      const { error } = await supabase
        .from('contratacoes_clientes')
        .delete()
        .eq('id', clientId);

      if (error) {
        console.error('Erro ao deletar cliente:', error);
        throw error;
      }

      console.log('Cliente deletado com sucesso');
      
      // Recarregar dados após deletar
      await fetchClients();

      return true;
    } catch (err) {
      console.error('Erro ao deletar cliente:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const refetch = () => {
    fetchClients();
  };

  return { 
    clients, 
    loading, 
    error, 
    refetch, 
    updateClientStatus,
    updateClient,
    deleteClient
  };
};

const calcularProximoVencimento = (dataContratacao: Date, plano: string): Date => {
  const proximoVencimento = new Date(dataContratacao);
  
  switch (plano) {
    case '1 ANO':
      proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1);
      break;
    case '2 ANOS':
      proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 2);
      break;
    case '1 MES':
      proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);
      break;
    default:
      proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1);
  }
  
  return proximoVencimento;
};

const formatarNomePlano = (plano: string): string => {
  switch (plano) {
    case '1 ANO':
      return 'Plano Anual';
    case '2 ANOS':
      return 'Plano Bianual';
    case '1 MES':
      return 'Plano Mensal';
    default:
      return 'Plano Anual';
  }
};
