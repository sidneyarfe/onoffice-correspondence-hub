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
  status: 'iniciado' | 'contrato_enviado' | 'contrato_assinado' | 'pagamento_pendente' | 'pagamento_confirmado' | 'ativo' | 'suspenso' | 'cancelado';
  joinDate: string;
  nextDue: string;
  correspondences: number;
  tipo_pessoa: string;
  cpf_responsavel: string;
  razao_social?: string;
  status_original: string;
  // Novos campos
  produto_nome?: string;
  plano_nome?: string;
  ultimo_pagamento?: string;
  data_encerramento?: string;
  proximo_vencimento_editavel?: string;
  total_planos: number;
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
        .select('*')
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
            proximoVencimento = calcularProximoVencimento(dataContratacao, contratacao.plano_selecionado || '1 ANO');
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
            plan: formatarNomePlano(contratacao.plano_selecionado || '1 ANO'),
            status,
            joinDate: new Date(contratacao.created_at).toLocaleDateString('pt-BR'),
            nextDue: proximoVencimento.toLocaleDateString('pt-BR'),
            correspondences: correspondencesCount,
            tipo_pessoa: contratacao.tipo_pessoa || 'fisica',
            cpf_responsavel: contratacao.cpf_responsavel || 'CPF não informado',
            razao_social: contratacao.razao_social || '',
            status_original: contratacao.status_contratacao || 'INICIADO',
            // Novos campos
            produto_nome: 'Endereço Fiscal', // Produto padrão
            plano_nome: formatarNomePlano(contratacao.plano_selecionado || '1 ANO'),
            ultimo_pagamento: contratacao.ultimo_pagamento ? new Date(contratacao.ultimo_pagamento).toLocaleDateString('pt-BR') : undefined,
            data_encerramento: contratacao.data_encerramento ? new Date(contratacao.data_encerramento).toLocaleDateString('pt-BR') : undefined,
            proximo_vencimento: contratacao.proximo_vencimento ? new Date(contratacao.proximo_vencimento).toLocaleDateString('pt-BR') : undefined,
            total_planos: 1 // TODO: contar planos ativos do cliente
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

  const updateClient = async (clientId: string, formData: any) => {
    try {
      console.log('Atualizando cliente:', clientId, formData);
      
      const payload: any = {
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
      };

      // Apenas incluir campos de plano/produto se estiverem definidos
      if (formData.produto_id) payload.produto_id = formData.produto_id;
      if (formData.plano_id) payload.plano_id = formData.plano_id;
      if (formData.produto_selecionado) payload.produto_selecionado = formData.produto_selecionado;
      if (formData.proximo_vencimento) payload.proximo_vencimento = formData.proximo_vencimento;

      // Se um plano foi selecionado no formulário, garantir criação em cliente_planos
      if (formData.plano_id) {
        // Verificar se já existe esse plano para o cliente (evitar duplicidade)
        const { data: existente } = await supabase
          .from('cliente_planos')
          .select('id')
          .eq('cliente_id', clientId)
          .eq('plano_id', formData.plano_id)
          .maybeSingle();

        // Buscar informações do plano para preencher dados e calcular vencimento
        const { data: planoInfo, error: planoErr } = await supabase
          .from('planos')
          .select('id, nome_plano, periodicidade, produto_id, produtos:produto_id ( nome_produto )')
          .eq('id', formData.plano_id)
          .single();
        if (planoErr) throw planoErr;

        // Calcular próximo vencimento caso não venha do formulário
        const hoje = new Date();
        const proximoVenc = new Date(hoje);
        switch (planoInfo.periodicidade || 'anual') {
          case 'semanal':
            proximoVenc.setDate(proximoVenc.getDate() + 7); break;
          case 'mensal':
            proximoVenc.setMonth(proximoVenc.getMonth() + 1); break;
          case 'trimestral':
            proximoVenc.setMonth(proximoVenc.getMonth() + 3); break;
          case 'semestral':
            proximoVenc.setMonth(proximoVenc.getMonth() + 6); break;
          case 'bianual':
            proximoVenc.setFullYear(proximoVenc.getFullYear() + 2); break;
          case 'anual':
          default:
            proximoVenc.setFullYear(proximoVenc.getFullYear() + 1); break;
        }
        const proxVencStr = (formData.proximo_vencimento || proximoVenc.toISOString().split('T')[0]);

        // Criar registro em cliente_planos se ainda não existir
        if (!existente) {
          const { error: insertPlanoErr } = await supabase
            .from('cliente_planos')
            .insert({
              cliente_id: clientId,
              plano_id: formData.plano_id,
              data_inicio: hoje.toISOString().split('T')[0],
              proximo_vencimento: proxVencStr,
              status: 'ativo'
            });
          if (insertPlanoErr) throw insertPlanoErr;
        }

        // Preencher payload da contratação com infos do plano/produto calculadas
        payload.plano_id = formData.plano_id;
        payload.plano_selecionado = planoInfo.nome_plano;
        payload.produto_id = planoInfo.produto_id;
        payload.produto_selecionado = planoInfo.produtos?.nome_produto || payload.produto_selecionado || null;
        payload.proximo_vencimento = proxVencStr;
      }

      const { error } = await supabase
        .from('contratacoes_clientes')
        .update(payload)
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
