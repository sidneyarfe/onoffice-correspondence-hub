import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeRefetch } from './useRealtimeRefetch';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================================
// Insights (admin) — séries de gráfico derivadas de dados REAIS da plataforma:
//   • crescimento de clientes (novos + acumulado por mês) — `contratacoes_clientes`
//   • volume de correspondências por mês — `correspondencias`
//   • distribuição por plano (clientes ativos) — `contratacoes_clientes`
//   • correspondências por categoria — `correspondencias`
//   • split Pessoa Física × Jurídica — `contratacoes_clientes`
// Nenhum número é inventado: tudo agregado das tabelas. Realtime ao vivo.
// ============================================================================

export interface ClientGrowthPoint {
  mes: string;
  novos: number;
  total: number;
}

export interface CorrespondenceMonthly {
  mes: string;
  count: number;
}

export interface DistributionSlice {
  label: string;
  count: number;
  color: string;
}

export interface AdminInsights {
  clientGrowth: ClientGrowthPoint[];
  correspondencesMonthly: CorrespondenceMonthly[];
  planDistribution: DistributionSlice[];
  categoryDistribution: DistributionSlice[];
  pessoaSplit: { pf: number; pj: number };
  totalCorrespondencias: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const PLAN_COLORS: Record<string, string> = {
  '1 ANO': '#60FF00',
  '6 MESES': '#3B82F6',
  '1 MES': '#A78BFA',
};
const planColor = (plano: string, i: number) =>
  PLAN_COLORS[plano] ?? ['#60FF00', '#3B82F6', '#A78BFA', '#FBBF24', '#F87171', '#6B7280'][i % 6];

const CATEGORY_PALETTE = ['#60FF00', '#3B82F6', '#A78BFA', '#FBBF24', '#F472B6', '#6B7280'];

const MONTHS_WINDOW = 6;

export const useAdminInsights = (): AdminInsights => {
  const [clientGrowth, setClientGrowth] = useState<ClientGrowthPoint[]>([]);
  const [correspondencesMonthly, setCorrespondencesMonthly] = useState<CorrespondenceMonthly[]>([]);
  const [planDistribution, setPlanDistribution] = useState<DistributionSlice[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<DistributionSlice[]>([]);
  const [pessoaSplit, setPessoaSplit] = useState<{ pf: number; pj: number }>({ pf: 0, pj: 0 });
  const [totalCorrespondencias, setTotalCorrespondencias] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const windowStart = startOfMonth(subMonths(new Date(), MONTHS_WINDOW - 1));

      const [cliRes, corrRes] = await Promise.all([
        supabase
          .from('contratacoes_clientes')
          .select('created_at, plano_selecionado, status_contratacao, tipo_pessoa'),
        supabase
          .from('correspondencias')
          .select('created_at, categoria')
          .gte('created_at', windowStart.toISOString()),
      ]);

      if (cliRes.error) throw cliRes.error;
      if (corrRes.error) throw corrRes.error;

      const clientes = (cliRes.data ?? []) as Array<{
        created_at: string | null;
        plano_selecionado: string | null;
        status_contratacao: string | null;
        tipo_pessoa: string | null;
      }>;
      const correspondencias = (corrRes.data ?? []) as Array<{
        created_at: string | null;
        categoria: string | null;
      }>;

      // ── Esqueleto de meses (label + chave ano-mês) ─────────────────────────
      const monthsSkeleton = Array.from({ length: MONTHS_WINDOW }, (_, i) => {
        const d = subMonths(new Date(), MONTHS_WINDOW - 1 - i);
        return {
          key: `${d.getFullYear()}-${d.getMonth()}`,
          mes: format(d, 'MMM', { locale: ptBR }),
        };
      });

      // ── Crescimento de clientes (novos por mês + acumulado) ────────────────
      const novosPorMes = new Map<string, number>();
      let totalAntesDaJanela = 0;
      clientes.forEach((c) => {
        if (!c.created_at) return;
        const d = new Date(c.created_at);
        if (Number.isNaN(d.getTime())) return;
        if (d < windowStart) {
          totalAntesDaJanela += 1;
          return;
        }
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        novosPorMes.set(key, (novosPorMes.get(key) ?? 0) + 1);
      });
      let acumulado = totalAntesDaJanela;
      setClientGrowth(
        monthsSkeleton.map(({ key, mes }) => {
          const novos = novosPorMes.get(key) ?? 0;
          acumulado += novos;
          return { mes, novos, total: acumulado };
        }),
      );

      // ── Correspondências por mês ───────────────────────────────────────────
      const corrPorMes = new Map<string, number>();
      correspondencias.forEach((c) => {
        if (!c.created_at) return;
        const d = new Date(c.created_at);
        if (Number.isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        corrPorMes.set(key, (corrPorMes.get(key) ?? 0) + 1);
      });
      setCorrespondencesMonthly(
        monthsSkeleton.map(({ key, mes }) => ({ mes, count: corrPorMes.get(key) ?? 0 })),
      );
      setTotalCorrespondencias(correspondencias.length);

      // ── Distribuição por plano (clientes ativos) ───────────────────────────
      const ativos = clientes.filter((c) => c.status_contratacao === 'ATIVO');
      const baseParaPlano = ativos.length ? ativos : clientes;
      const planoCount = new Map<string, number>();
      baseParaPlano.forEach((c) => {
        const p = (c.plano_selecionado || 'Sem plano').trim() || 'Sem plano';
        planoCount.set(p, (planoCount.get(p) ?? 0) + 1);
      });
      setPlanDistribution(
        [...planoCount.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([label, count], i) => ({ label, count, color: planColor(label, i) })),
      );

      // ── Correspondências por categoria (top 6) ─────────────────────────────
      const catCount = new Map<string, number>();
      correspondencias.forEach((c) => {
        const cat = (c.categoria || 'Outros').trim() || 'Outros';
        catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
      });
      setCategoryDistribution(
        [...catCount.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([label, count], i) => ({ label, count, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] })),
      );

      // ── Split PF × PJ ──────────────────────────────────────────────────────
      let pf = 0;
      let pj = 0;
      clientes.forEach((c) => {
        if (c.tipo_pessoa === 'juridica') pj += 1;
        else if (c.tipo_pessoa === 'fisica') pf += 1;
      });
      setPessoaSplit({ pf, pj });
    } catch (err) {
      console.error('Erro ao carregar insights:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar insights.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefetch(['contratacoes_clientes', 'correspondencias'], () => load(true));

  return {
    clientGrowth,
    correspondencesMonthly,
    planDistribution,
    categoryDistribution,
    pessoaSplit,
    totalCorrespondencias,
    loading,
    error,
    refetch: () => load(true),
  };
};
