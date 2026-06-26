import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calcularVencimentoDePlanoLegado } from '@/utils/vencimento';

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
  status: 'iniciado' | 'contrato_enviado' | 'contrato_assinado' | 'pagamento_pendente' | 'pagamento_confirmado' | 'ativo' | 'suspenso' | 'cancelado';
  joinDate: string;
  nextDue: string;
  correspondences: number;
  tipo_pessoa: string;
  cpf_responsavel: string;
  razao_social?: string;
  status_original: string;
  // Reformulação: foto + contrato assinado anexado (migração 20260626120000)
  avatar_url?: string;
  contrato_assinado_url?: string;
  preco?: number; // mensalidade em centavos (contratacoes_clientes.preco)
  periodicidade?: string;
  // Novos campos
  produto_nome?: string;
  plano_nome?: string;
  ultimo_pagamento?: string;
  data_encerramento?: string;
  proximo_vencimento?: string;
  total_planos: number;
  // Campos para edição
  produto_selecionado?: string;
  plano_selecionado?: string;
  produto_id?: string;
  plano_id?: string;
}

export const useAdminClients = () => {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Buscando TODOS os clientes da tabela contratacoes_clientes...');

      const { data: contratacoes, error: contratError } = await supabase
        .from('contratacoes_clientes')
        .select(`
          *,
          produtos:produto_id(id, nome_produto),
          planos:plano_id(id, nome_plano, periodicidade)
        `)
        .order('created_at', { ascending: false });

      if (contratError) {
        console.error('❌ Erro ao buscar contratações:', contratError);
        throw contratError;
      }

      console.log(`📊 Total de registros encontrados: ${contratacoes?.length || 0}`);
      console.log('📋 Registros encontrados:', contratacoes);

      // Buscar contagem de correspondências para cada cliente - COM TRATAMENTO DE NULOS
      const clientsData = await Promise.all(
        (contratacoes || []).map(async (contratacao, index) => {
          console.log(`🔄 Processando cliente ${index + 1}/${contratacoes?.length}: ${contratacao.id}`);
          
          let correspondencesCount = 0;
          
          if (contratacao.user_id) {
            try {
              const { data: correspondencias } = await supabase
                .from('correspondencias')
                .select('id')
                .eq('user_id', contratacao.user_id);
              
              correspondencesCount = correspondencias?.length || 0;
            } catch (corrError) {
              console.warn(`⚠️ Erro ao buscar correspondências para cliente ${contratacao.id}:`, corrError);
            }
          }

          // Calcular próximo vencimento - COM FALLBACK
          let proximoVencimento: Date;
          try {
            const dataContratacao = new Date(contratacao.created_at);
            proximoVencimento = calcularVencimentoDePlanoLegado(dataContratacao, contratacao.plano_selecionado || '1 ANO');
          } catch (dateError) {
            console.warn(`⚠️ Erro ao calcular vencimento para cliente ${contratacao.id}:`, dateError);
            proximoVencimento = new Date(); // Fallback para hoje
          }

          // Determinar status baseado no status_contratacao - TODOS OS STATUS COM FALLBACK
          let status: AdminClient['status'] = 'iniciado';
          
          switch (contratacao.status_contratacao) {
            case 'INICIADO':
              status = 'iniciado';
              break;
            case 'CONTRATO_ENVIADO':
              status = 'contrato_enviado';
              break;
            case 'CONTRATO_ASSINADO':
              status = 'contrato_assinado';
              break;
            case 'PAGAMENTO_PENDENTE':
              status = 'pagamento_pendente';
              break;
            case 'PAGAMENTO_CONFIRMADO':
              status = 'pagamento_confirmado';
              break;
            case 'ATIVO':
              status = 'ativo';
              break;
            case 'SUSPENSO':
              status = 'suspenso';
              break;
            case 'CANCELADO':
              status = 'cancelado';
              break;
            default:
              console.warn(`⚠️ Status desconhecido: ${contratacao.status_contratacao}`);
              status = 'iniciado';
          }

          // Endereço completo formatado - COM TRATAMENTO DE NULOS
          let enderecoCompleto = 'Endereço não informado';
          try {
            const endereco = contratacao.endereco || 'Não informado';
            const numero = contratacao.numero_endereco || 'S/N';
            const complemento = contratacao.complemento_endereco ? `, ${contratacao.complemento_endereco}` : '';
            enderecoCompleto = `${endereco}, ${numero}${complemento}`;
          } catch (endError) {
            console.warn(`⚠️ Erro ao formatar endereço para cliente ${contratacao.id}:`, endError);
          }

          // Obter informações do plano baseado nos IDs armazenados
          const produtoNome = contratacao.produtos?.nome_produto || contratacao.produto_selecionado || 'Não definido';
          const planoNome = contratacao.planos?.nome_plano || contratacao.plano_selecionado || 'Não definido';
          const planDescription = `${produtoNome} - ${planoNome}`;

          const cliente = {
            id: contratacao.id,
            user_id: contratacao.user_id,
            name: contratacao.razao_social || contratacao.nome_responsavel || 'Nome não informado',
            cnpj: contratacao.cnpj || (contratacao.tipo_pessoa === 'juridica' ? 'CNPJ não informado' : 'N/A'),
            email: contratacao.email || 'Email não informado',
            telefone: contratacao.telefone || 'Telefone não informado',
            endereco: enderecoCompleto,
            numero_endereco: contratacao.numero_endereco || 'S/N',
            complemento_endereco: contratacao.complemento_endereco || '',
            bairro: contratacao.bairro || 'Não informado',
            cidade: contratacao.cidade || 'Cidade não informada',
            estado: contratacao.estado || 'Estado não informado',
            cep: contratacao.cep || 'CEP não informado',
            plan: planDescription,
            status,
            joinDate: new Date(contratacao.created_at).toLocaleDateString('pt-BR'),
            nextDue: contratacao.proximo_vencimento ? new Date(contratacao.proximo_vencimento).toLocaleDateString('pt-BR') : proximoVencimento.toLocaleDateString('pt-BR'),
            correspondences: correspondencesCount,
            tipo_pessoa: contratacao.tipo_pessoa || 'fisica',
            cpf_responsavel: contratacao.cpf_responsavel || 'CPF não informado',
            razao_social: contratacao.razao_social || '',
            status_original: contratacao.status_contratacao || 'INICIADO',
            // Reformulação (migração 20260626120000)
            avatar_url: contratacao.avatar_url || undefined,
            contrato_assinado_url: contratacao.contrato_assinado_url || undefined,
            preco: contratacao.preco ?? undefined,
            periodicidade: contratacao.planos?.periodicidade || undefined,
            // Novos campos - usar dados do banco quando disponíveis
            produto_nome: produtoNome,
            plano_nome: planoNome,
            ultimo_pagamento: contratacao.ultimo_pagamento ? new Date(contratacao.ultimo_pagamento).toLocaleDateString('pt-BR') : undefined,
            data_encerramento: contratacao.data_encerramento ? new Date(contratacao.data_encerramento).toLocaleDateString('pt-BR') : undefined,
            proximo_vencimento: contratacao.proximo_vencimento ? new Date(contratacao.proximo_vencimento).toLocaleDateString('pt-BR') : undefined,
            total_planos: 1, // TODO: contar planos ativos do cliente
            // Campos para edição
            produto_selecionado: contratacao.produto_selecionado,
            plano_selecionado: contratacao.plano_selecionado,
            produto_id: contratacao.produto_id,
            plano_id: contratacao.plano_id
          };

          console.log(`✅ Cliente processado: ${cliente.name} (${cliente.status})`);
          return cliente;
        })
      );

      console.log(`🎉 Total de clientes processados com sucesso: ${clientsData.length}`);
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
      // Mapear status do frontend para o backend - ATUALIZADO PARA TODOS OS STATUS
      let dbStatus = 'INICIADO';
      switch (newStatus) {
        case 'iniciado':
          dbStatus = 'INICIADO';
          break;
        case 'contrato_enviado':
          dbStatus = 'CONTRATO_ENVIADO';
          break;
        case 'contrato_assinado':
          dbStatus = 'CONTRATO_ASSINADO';
          break;
        case 'pagamento_pendente':
          dbStatus = 'PAGAMENTO_PENDENTE';
          break;
        case 'pagamento_confirmado':
          dbStatus = 'PAGAMENTO_CONFIRMADO';
          break;
        case 'ativo':
          dbStatus = 'ATIVO';
          break;
        case 'suspenso':
          dbStatus = 'SUSPENSO';
          break;
        case 'cancelado':
          dbStatus = 'CANCELADO';
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
    deleteClient
  };
};
