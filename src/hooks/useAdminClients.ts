
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminClient {
  id: string;
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

          // Determinar status baseado na data de vencimento e status da contratação
          let status: AdminClient['status'] = 'pending';
          
          if (contratacao.status_contratacao === 'ATIVO') {
            const hoje = new Date();
            if (proximoVencimento < hoje) {
              status = 'overdue';
            } else {
              status = 'active';
            }
          } else if (contratacao.status_contratacao === 'SUSPENSO') {
            status = 'suspended';
          }

          // Endereço completo formatado
          const enderecoCompleto = `${contratacao.endereco}, ${contratacao.numero_endereco}${contratacao.complemento_endereco ? `, ${contratacao.complemento_endereco}` : ''}`;

          return {
            id: contratacao.id,
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

  useEffect(() => {
    fetchClients();
  }, []);

  const refetch = () => {
    fetchClients();
  };

  return { clients, loading, error, refetch };
};

const calcularProximoVencimento = (dataContratacao: Date, plano: string): Date => {
  const proximoVencimento = new Date(dataContratacao);
  
  switch (plano) {
    case '1 ANO':
      proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1);
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
    case '1 MES':
      return 'Plano Mensal';
    default:
      return 'Plano Anual';
  }
};
