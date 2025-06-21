
import { useState, useEffect, useRef } from 'react';
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

interface UserContratacaoData {
  user_info: {
    id: string;
    email: string;
    created_at: string;
  };
  profile: {
    full_name: string;
    role: string;
    password_changed: boolean;
    temporary_password: string | null;
  };
  contratacao: {
    id: string;
    plano_selecionado: string;
    tipo_pessoa: string;
    nome_responsavel: string;
    email: string;
    telefone: string;
    status_contratacao: string;
    created_at: string;
  } | null;
}

export const useClientData = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const cacheRef = useRef<{ userId: string; data: ClientStats; timestamp: number } | null>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearCache = () => {
    cacheRef.current = null;
  };

  useEffect(() => {
    const fetchClientData = async () => {
      if (!user?.id) {
        if (mountedRef.current) {
          setStats(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      // Evitar múltiplas chamadas simultâneas
      if (fetchingRef.current) {
        console.log('Busca já em andamento, ignorando...');
        return;
      }

      // Verificar cache
      const now = Date.now();
      if (cacheRef.current && 
          cacheRef.current.userId === user.id && 
          (now - cacheRef.current.timestamp) < CACHE_DURATION) {
        console.log('Usando dados em cache');
        if (mountedRef.current) {
          setStats(cacheRef.current.data);
          setLoading(false);
          setError(null);
        }
        return;
      }

      fetchingRef.current = true;
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      try {
        console.log('Buscando dados para user_id:', user.id);

        // Buscar dados da contratação com a função do Supabase
        const { data: userData, error: userDataError } = await supabase
          .rpc('get_user_contratacao_data', { p_user_id: user.id });

        if (userDataError) {
          console.error('Erro ao buscar dados do usuário:', userDataError);
          throw new Error('Erro ao buscar dados da contratação');
        }

        console.log('Dados retornados pela função:', userData);

        // Type assertion para acessar as propriedades corretamente
        const typedUserData = userData as unknown as UserContratacaoData;

        if (!typedUserData || !typedUserData.contratacao) {
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
          
          // Armazenar no cache
          cacheRef.current = {
            userId: user.id,
            data: emptyStats,
            timestamp: now
          };
          
          if (mountedRef.current) {
            setStats(emptyStats);
          }
          return;
        }

        const contratacao = typedUserData.contratacao;

        // Buscar correspondências
        const { data: correspondencias, error: corrError } = await supabase
          .from('correspondencias')
          .select('*')
          .eq('user_id', user.id);

        if (corrError) {
          console.warn('Erro ao buscar correspondências:', corrError);
        }

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

        // Armazenar no cache
        cacheRef.current = {
          userId: user.id,
          data: clientStats,
          timestamp: now
        };

        if (mountedRef.current) {
          setStats(clientStats);
        }
        
        // Registrar atividade de visualização do dashboard (sem await para não bloquear)
        try {
          await supabase.rpc('registrar_atividade', {
            p_user_id: user.id,
            p_acao: 'dashboard_acesso',
            p_descricao: 'Usuário acessou o dashboard'
          });
        } catch (err) {
          console.warn('Erro ao registrar atividade:', err);
        }

      } catch (err) {
        console.error('Erro ao buscar dados do cliente:', err);
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        fetchingRef.current = false;
      }
    };

    fetchClientData();

    // Cleanup quando o usuário muda ou componente desmonta
    return () => {
      if (cacheRef.current && cacheRef.current.userId !== user?.id) {
        cacheRef.current = null;
      }
    };
  }, [user?.id]);

  // Função para limpar cache manualmente (útil para refresh)
  const refreshData = () => {
    clearCache();
    if (user?.id && mountedRef.current) {
      setLoading(true);
      setError(null);
    }
  };

  return { stats, loading, error, refreshData };
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
