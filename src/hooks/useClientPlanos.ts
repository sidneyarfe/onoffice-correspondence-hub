import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface ClientePlano {
  id: string;
  cliente_id: string;
  plano_id: string;
  data_contratacao: string;
  data_inicio: string;
  proximo_vencimento: string;
  status: 'ativo' | 'suspenso' | 'cancelado';
  valor_pago_centavos: number | null;
  data_ultimo_pagamento: string | null;
  plano?: {
    id: string;
    nome_plano: string;
    periodicidade: string;
    preco_em_centavos: number;
    produtos?: {
      nome_produto: string;
    };
  };
}

export const useClientPlanos = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchClientePlanos = async (clienteId: string): Promise<ClientePlano[]> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('cliente_planos')
        .select(`
          *,
          plano:plano_id (
            id,
            nome_plano,
            periodicidade,
            preco_em_centavos,
            produtos:produto_id (
              nome_produto
            )
          )
        `)
        .eq('cliente_id', clienteId)
        .order('data_contratacao', { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        ...item,
        status: item.status as 'ativo' | 'suspenso' | 'cancelado',
        data_contratacao: new Date(item.data_contratacao).toLocaleDateString('pt-BR'),
        data_inicio: new Date(item.data_inicio).toLocaleDateString('pt-BR'),
        proximo_vencimento: new Date(item.proximo_vencimento).toLocaleDateString('pt-BR'),
        data_ultimo_pagamento: item.data_ultimo_pagamento 
          ? new Date(item.data_ultimo_pagamento).toLocaleDateString('pt-BR')
          : null
      })) || [];

    } catch (error) {
      console.error('Erro ao buscar planos do cliente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os planos do cliente',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const adicionarPlanoAoCliente = async (
    clienteId: string, 
    planoId: string, 
    dataInicio?: Date
  ): Promise<boolean> => {
    try {
      setLoading(true);

      // Buscar informações do plano para calcular vencimento
      const { data: plano, error: planoError } = await supabase
        .from('planos')
        .select('periodicidade, preco_em_centavos')
        .eq('id', planoId)
        .single();

      if (planoError) throw planoError;

      const inicio = dataInicio || new Date();
      
      // Calcular próximo vencimento baseado na periodicidade
      const proximoVencimento = new Date(inicio);
      switch (plano.periodicidade) {
        case 'semanal':
          proximoVencimento.setDate(proximoVencimento.getDate() + 7);
          break;
        case 'mensal':
          proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);
          break;
        case 'trimestral':
          proximoVencimento.setMonth(proximoVencimento.getMonth() + 3);
          break;
        case 'semestral':
          proximoVencimento.setMonth(proximoVencimento.getMonth() + 6);
          break;
        case 'anual':
          proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1);
          break;
        case 'bianual':
          proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 2);
          break;
        default:
          proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1);
      }

      const { error } = await supabase
        .from('cliente_planos')
        .insert({
          cliente_id: clienteId,
          plano_id: planoId,
          data_inicio: inicio.toISOString().split('T')[0],
          proximo_vencimento: proximoVencimento.toISOString().split('T')[0],
          status: 'ativo'
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Plano adicionado ao cliente com sucesso',
      });

      return true;
    } catch (error) {
      console.error('Erro ao adicionar plano ao cliente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o plano ao cliente',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const atualizarClientePlano = async (
    clientePlanoId: string,
    updates: Partial<{
      proximo_vencimento: Date;
      status: 'ativo' | 'suspenso' | 'cancelado';
      data_ultimo_pagamento: Date;
      valor_pago_centavos: number;
    }>
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const formatUpdates: any = {};
      
      if (updates.proximo_vencimento) {
        formatUpdates.proximo_vencimento = updates.proximo_vencimento.toISOString().split('T')[0];
      }
      
      if (updates.data_ultimo_pagamento) {
        formatUpdates.data_ultimo_pagamento = updates.data_ultimo_pagamento.toISOString().split('T')[0];
      }

      if (updates.status) {
        formatUpdates.status = updates.status;
      }

      if (updates.valor_pago_centavos !== undefined) {
        formatUpdates.valor_pago_centavos = updates.valor_pago_centavos;
      }

      const { error } = await supabase
        .from('cliente_planos')
        .update(formatUpdates)
        .eq('id', clientePlanoId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Plano do cliente atualizado com sucesso',
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar plano do cliente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o plano do cliente',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removerPlanoDoCliente = async (clientePlanoId: string): Promise<boolean> => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('cliente_planos')
        .delete()
        .eq('id', clientePlanoId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Plano removido do cliente com sucesso',
      });

      return true;
    } catch (error) {
      console.error('Erro ao remover plano do cliente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o plano do cliente',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchClientePlanos,
    adicionarPlanoAoCliente,
    atualizarClientePlano,
    removerPlanoDoCliente,
  };
};