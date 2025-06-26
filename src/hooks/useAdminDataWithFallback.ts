
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  totalClientes: number;
  clientesAtivos: number;
  correspondenciasHoje: number;
  receitaMensal: number;
  taxaAdimplencia: number;
}

export interface AdminActivity {
  id: string;
  action: string;
  client: string;
  time: string;
  type: string;
}

export const useAdminDataWithFallback = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAdminAuth = () => {
    try {
      const adminSession = localStorage.getItem('onoffice_admin_session');
      if (!adminSession) return false;

      const session = JSON.parse(adminSession);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      return session.isAdmin && (Date.now() - session.timestamp <= TWENTY_FOUR_HOURS);
    } catch {
      return false;
    }
  };

  const fetchDataWithTimeout = async <T>(
    promise: Promise<T>, 
    timeoutMs: number = 8000,
    fallbackValue: T
  ): Promise<T> => {
    try {
      const timeoutPromise = new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeoutMs);
      });

      return await Promise.race([promise, timeoutPromise]);
    } catch (error) {
      console.warn('Operação com timeout, usando fallback:', error);
      return fallbackValue;
    }
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('=== BUSCANDO DADOS ADMIN COM FALLBACK ===');
      
      if (!checkAdminAuth()) {
        console.error('Não autenticado como admin');
        setError('Sessão admin não encontrada');
        setLoading(false);
        return;
      }

      // Buscar estatísticas com timeout e fallback
      const contratacoes = await fetchDataWithTimeout(
        supabase.from('contratacoes_clientes').select('*'),
        5000,
        { data: [], error: null }
      );

      if (contratacoes.error) {
        console.warn('Erro ao buscar contratações:', contratacoes.error);
      }

      // Calcular métricas com dados disponíveis
      const contratacoesData = contratacoes.data || [];
      const totalClientes = contratacoesData.length;
      const clientesAtivos = contratacoesData.filter(c => c.status_contratacao === 'ATIVO').length;

      // Calcular receita mensal
      const receitaMensal = contratacoesData.reduce((total, contrato) => {
        if (contrato.status_contratacao === 'ATIVO') {
          switch (contrato.plano_selecionado) {
            case '1 ANO': return total + (1188 / 12);
            case '6 MESES': return total + 109;
            case '1 MES': return total + 129;
            default: return total + 99;
          }
        }
        return total;
      }, 0);

      // Buscar correspondências de hoje com timeout
      const hoje = new Date().toISOString().split('T')[0];
      const correspondenciasHoje = await fetchDataWithTimeout(
        supabase
          .from('correspondencias')
          .select('*')
          .gte('created_at', hoje)
          .lt('created_at', `${hoje}T23:59:59`),
        3000,
        { data: [], error: null }
      );

      // Calcular taxa de adimplência
      const taxaAdimplencia = totalClientes > 0 ? (clientesAtivos / totalClientes) * 100 : 100;

      setStats({
        totalClientes,
        clientesAtivos,
        correspondenciasHoje: correspondenciasHoje.data?.length || 0,
        receitaMensal,
        taxaAdimplencia: Math.min(100, taxaAdimplencia)
      });

      // Buscar atividades com timeout
      const atividadesResult = await fetchDataWithTimeout(
        supabase
          .from('atividades_cliente')
          .select(`
            *,
            contratacoes_clientes!inner(razao_social, nome_responsavel)
          `)
          .order('data_atividade', { ascending: false })
          .limit(10),
        5000,
        { data: [], error: null }
      );

      if (atividadesResult.error) {
        console.warn('Erro ao buscar atividades:', atividadesResult.error);
        setActivities([]);
      } else {
        const activitiesFormatted: AdminActivity[] = atividadesResult.data?.map(atividade => {
          const contratacao = atividade.contratacoes_clientes as any;
          const clientName = contratacao?.razao_social || contratacao?.nome_responsavel || 'Cliente';
          const timeAgo = getTimeAgo(atividade.data_atividade);
          
          return {
            id: atividade.id,
            action: atividade.descricao,
            client: clientName,
            time: timeAgo,
            type: getActivityType(atividade.acao)
          };
        }) || [];

        setActivities(activitiesFormatted);
      }

      console.log('✓ Dados admin carregados com sucesso');

    } catch (err) {
      console.error('Erro geral ao buscar dados administrativos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      
      // Definir valores padrão em caso de erro
      setStats({
        totalClientes: 0,
        clientesAtivos: 0,
        correspondenciasHoje: 0,
        receitaMensal: 0,
        taxaAdimplencia: 0
      });
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verificar autenticação admin e aguardar inicialização
    const checkAndFetch = () => {
      if (checkAdminAuth()) {
        fetchAdminData();
      } else {
        setLoading(false);
        setError('Sessão admin não encontrada');
      }
    };

    // Aguardar um tempo para o AuthContext se estabelecer
    const timer = setTimeout(checkAndFetch, 1000);
    return () => clearTimeout(timer);
  }, []);

  return { 
    stats, 
    activities, 
    loading, 
    error, 
    refetch: fetchAdminData 
  };
};

const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'agora';
  if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h atrás`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} dias atrás`;
};

const getActivityType = (acao: string): string => {
  if (acao.includes('login') || acao.includes('dashboard')) return 'view';
  if (acao.includes('correspondencia')) return 'correspondence';
  if (acao.includes('pagamento')) return 'payment';
  if (acao.includes('cliente')) return 'client';
  return 'view';
};
