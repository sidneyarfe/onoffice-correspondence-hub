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

export const useAdminData = () => {
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

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('=== BUSCANDO DADOS ADMIN ===');
        
        if (!checkAdminAuth()) {
          console.error('Não autenticado como admin');
          setError('Sessão admin não encontrada');
          setLoading(false);
          return;
        }

        // Buscar estatísticas de clientes
        const { data: contratacoes, error: contratError } = await supabase
          .from('contratacoes_clientes')
          .select('*');

        if (contratError) {
          console.error('Erro ao buscar contratações:', contratError);
          setError(`Erro ao buscar dados: ${contratError.message}`);
          setLoading(false);
          return;
        }

        // Calcular métricas
        const totalClientes = contratacoes?.length || 0;
        const clientesAtivos = contratacoes?.filter(c => c.status_contratacao === 'ATIVO').length || 0;

        // Calcular receita mensal baseada nos planos ativos
        const receitaMensal = contratacoes?.reduce((total, contrato) => {
          if (contrato.status_contratacao === 'ATIVO') {
            switch (contrato.plano_selecionado) {
              case '1 ANO':
                return total + (1188 / 12); // R$ 99/mês
              case '6 MESES':
                return total + 109; // R$ 109/mês
              case '1 MES':
                return total + 129; // R$ 129/mês
              default:
                return total + 99;
            }
          }
          return total;
        }, 0) || 0;

        // Buscar correspondências de hoje
        const hoje = new Date().toISOString().split('T')[0];
        const { data: correspondenciasHoje, error: corrError } = await supabase
          .from('correspondencias')
          .select('*')
          .gte('created_at', hoje)
          .lt('created_at', `${hoje}T23:59:59`);

        if (corrError) {
          console.warn('Erro ao buscar correspondências de hoje:', corrError);
        }

        // Calcular taxa de adimplência (simplificada)
        const taxaAdimplencia = totalClientes > 0 ? (clientesAtivos / totalClientes) * 100 : 0;

        setStats({
          totalClientes,
          clientesAtivos,
          correspondenciasHoje: correspondenciasHoje?.length || 0,
          receitaMensal,
          taxaAdimplencia: Math.min(100, taxaAdimplencia)
        });

        // Buscar atividades recentes
        const { data: atividadesData, error: atividadesError } = await supabase
          .from('atividades_cliente')
          .select(`
            *,
            contratacoes_clientes!inner(razao_social, nome_responsavel)
          `)
          .order('data_atividade', { ascending: false })
          .limit(10);

        if (atividadesError) {
          console.warn('Erro ao buscar atividades:', atividadesError);
          setActivities([]);
        } else {
          const activitiesFormatted: AdminActivity[] = atividadesData?.map(atividade => {
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

        console.log('Dados admin carregados com sucesso');

      } catch (err) {
        console.error('Erro geral ao buscar dados administrativos:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    // Adicionar delay para permitir que o AuthContext termine de configurar
    const timer = setTimeout(() => {
      fetchAdminData();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return { stats, activities, loading, error };
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
