
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientStats {
  totalCorrespondencias: number;
  correspondenciasNaoLidas: number;
  totalDocumentos: number;
  proximoVencimento: {
    data: string;
    valor: number;
    diasRestantes: number;
  } | null;
  contaAtivaDias: number;
  planoCorreto: string;
  dataContratacao: string;
}

export const useClientData = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('Buscando dados para user_id:', user.id);

        // Buscar dados da contratação com a função do Supabase
        const { data: userData, error: userDataError } = await supabase
          .rpc('get_user_contratacao_data', { p_user_id: user.id });

        if (userDataError) {
          console.error('Erro ao buscar dados do usuário:', userDataError);
          throw new Error('Erro ao buscar dados da contratação');
        }

        console.log('Dados retornados pela função:', userData);

        if (!userData || !userData.contratacao) {
          console.log('Nenhuma contratação encontrada para o usuário');
          // Se não há contratação, criar stats vazias
          const emptyStats: ClientStats = {
            totalCorrespondencias: 0,
            correspondenciasNaoLidas: 0,
            totalDocumentos: 3, // Documentos padrão sempre disponíveis
            proximoVencimento: null,
            contaAtivaDias: 0,
            planoCorreto: 'Conta em preparação',
            dataContratacao: 'Processando contratação...'
          };
          setStats(emptyStats);
          setLoading(false);
          return;
        }

        const contratacao = userData.contratacao;

        // Buscar correspondências
        const { data: correspondencias } = await supabase
          .from('correspondencias')
          .select('*')
          .eq('user_id', user.id);

        // Documentos padrão sempre disponíveis
        const totalDocumentos = 3; // IPTU, AVCB, Inscrição Estadual

        // Calcular próximo vencimento com base na data de contratação
        const dataContratacao = new Date(contratacao.created_at);
        const proximoVencimento = calcularProximoVencimento(dataContratacao, contratacao.plano_selecionado);
        const hoje = new Date();
        const diasRestantes = Math.ceil((proximoVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        // Calcular dias desde contratação
        const contaAtivaDias = Math.floor((hoje.getTime() - dataContratacao.getTime()) / (1000 * 60 * 60 * 24));

        const clientStats: ClientStats = {
          totalCorrespondencias: correspondencias?.length || 0,
          correspondenciasNaoLidas: correspondencias?.filter(c => !c.visualizada).length || 0,
          totalDocumentos,
          proximoVencimento: {
            data: proximoVencimento.toLocaleDateString('pt-BR'),
            valor: getValorPlano(contratacao.plano_selecionado),
            diasRestantes: Math.max(0, diasRestantes)
          },
          contaAtivaDias: Math.max(0, contaAtivaDias),
          planoCorreto: formatarNomePlano(contratacao.plano_selecionado),
          dataContratacao: dataContratacao.toLocaleDateString('pt-BR')
        };

        setStats(clientStats);
        
        // Registrar atividade de visualização do dashboard
        await supabase.rpc('registrar_atividade', {
          p_user_id: user.id,
          p_acao: 'dashboard_acesso',
          p_descricao: 'Usuário acessou o dashboard'
        });

      } catch (err) {
        console.error('Erro ao buscar dados do cliente:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [user?.id]);

  return { stats, loading, error };
};

const calcularProximoVencimento = (dataContratacao: Date, plano: string): Date => {
  const proximoVencimento = new Date(dataContratacao);
  
  switch (plano) {
    case '1 ANO':
      proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1);
      break;
    case '6 MESES':
      proximoVencimento.setMonth(proximoVencimento.getMonth() + 6);
      break;
    case '1 MES':
      proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);
      break;
    default:
      proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1);
  }
  
  return proximoVencimento;
};

const getValorPlano = (plano: string): number => {
  switch (plano) {
    case '1 ANO':
      return 1188.00; // R$ 99/mês * 12 meses
    case '6 MESES':
      return 654.00; // R$ 109/mês * 6 meses
    case '1 MES':
      return 129.00;
    default:
      return 1188.00;
  }
};

const formatarNomePlano = (plano: string): string => {
  switch (plano) {
    case '1 ANO':
      return 'Plano Anual';
    case '6 MESES':
      return 'Plano Semestral';
    case '1 MES':
      return 'Plano Mensal';
    default:
      return 'Plano Anual';
  }
};
