import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { useAdminDataWithFallback } from '@/hooks/useAdminDataWithFallback';
import { useRecentActivities } from '@/hooks/useRecentActivities';
import { useRecentCorrespondences } from '@/hooks/useRecentCorrespondences';
import { useAdminFinanceiro } from '@/hooks/useAdminFinanceiro';
import { useAdminInsights } from '@/hooks/useAdminInsights';
import { humanizarAcao } from '@/utils/atividade';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  User,
  Mail,
  Building2,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  LogIn,
  CreditCard,
  UserPlus,
  KanbanSquare,
  UserCog,
  ChevronRight,
  Inbox,
  CalendarClock,
  Paperclip,
  Bot,
  type LucideIcon,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── helpers ────────────────────────────────────────────────────────────────

const brl = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Dias (inteiros) entre hoje e uma data futura — para rótulos de vencimento. */
const diasAteVencimento = (venc: Date) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((venc.getTime() - hoje.getTime()) / 86_400_000);
};

const revenueChartConfig: ChartConfig = {
  receita: { label: 'Receita', color: '#60FF00' },
};
const growthChartConfig: ChartConfig = {
  total: { label: 'Total de clientes', color: '#60FF00' },
};
const corrChartConfig: ChartConfig = {
  count: { label: 'Correspondências', color: '#3B82F6' },
};
const planChartConfig: ChartConfig = {
  count: { label: 'Clientes' },
};

// Sistema de acento semântico — disciplina de cor (lime=saudável, amber=alerta,
// red=crítico, blue=informativo, neutral=contexto). Evita o "arco-íris" amador.
type Accent = 'lime' | 'amber' | 'red' | 'blue' | 'neutral';
const ACCENTS: Record<Accent, { tile: string; spark: string }> = {
  lime: { tile: 'bg-on-lime/12 text-on-lime', spark: '#60FF00' },
  amber: { tile: 'bg-amber-500/12 text-amber-300', spark: '#FBBF24' },
  red: { tile: 'bg-red-500/12 text-red-400', spark: '#F87171' },
  blue: { tile: 'bg-blue-500/12 text-blue-300', spark: '#60A5FA' },
  neutral: { tile: 'bg-white/8 text-muted-foreground', spark: '#9CA3AF' },
};

const QUICK_ACTIONS: { label: string; sub: string; path: string; icon: LucideIcon; accent: Accent }[] = [
  { label: 'Clientes', sub: 'Gerenciar base', path: '/admin/clientes', icon: Users, accent: 'lime' },
  { label: 'CRM', sub: 'Funil de vendas', path: '/admin/crm', icon: KanbanSquare, accent: 'blue' },
  { label: 'Correspondências', sub: 'Entradas e baixas', path: '/admin/correspondencias', icon: Mail, accent: 'lime' },
  { label: 'Documentos', sub: 'Arquivos e contratos', path: '/admin/documentos', icon: FileText, accent: 'amber' },
  { label: 'Financeiro', sub: 'Faturas e receita', path: '/admin/financeiro', icon: DollarSign, accent: 'lime' },
  { label: 'Equipe', sub: 'Usuários e acessos', path: '/admin/equipe', icon: UserCog, accent: 'blue' },
];

// ─── delta badge (variação % real, mês-a-mês) ────────────────────────────────

const DeltaBadge = ({ value }: { value: number | null }) => {
  if (value === null) return null;
  const Icon = value === 0 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  const cls =
    value === 0
      ? 'text-muted-foreground bg-white/[0.06]'
      : value > 0
      ? 'text-on-lime bg-on-lime/10'
      : 'text-red-400 bg-red-500/10';
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-dm text-[11px] font-semibold leading-none ${cls}`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(0)}%
    </span>
  );
};

// ─── sparkline (micro-tendência sem eixos) ───────────────────────────────────

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const id = useMemo(() => `spark-${Math.random().toString(36).slice(2)}`, []);
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// ─── stat card (KPI rico: valor + delta/contexto + sparkline opcional) ────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: Accent;
  delta?: number | null;
  deltaLabel?: string;
  sub?: React.ReactNode;
  spark?: number[];
  onClick?: () => void;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  accent = 'neutral',
  delta = null,
  deltaLabel,
  sub,
  spark,
  onClick,
}: StatCardProps) => {
  const a = ACCENTS[accent];
  return (
    <Card
      className={`on-card overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <span className={`on-tile h-9 w-9 flex-shrink-0 ${a.tile}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-2 flex items-end gap-2">
          <p className="font-dm text-[26px] font-bold leading-none tracking-tight text-foreground">
            {value}
          </p>
          {delta !== null && <DeltaBadge value={delta} />}
        </div>

        {(sub || deltaLabel) && (
          <p className="mt-2 text-[11px] leading-tight text-muted-foreground/70">
            {deltaLabel ? <span className="text-muted-foreground/90">{deltaLabel}</span> : null}
            {deltaLabel && sub ? ' · ' : null}
            {sub}
          </p>
        )}

        {spark && spark.some((n) => n > 0) && (
          <div className="-mb-1 mt-3 h-10">
            <Sparkline data={spark} color={a.spark} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SkeletonKpi = () => (
  <Card className="on-card">
    <CardContent className="p-5">
      <div className="animate-pulse space-y-3">
        <div className="flex items-start justify-between">
          <div className="h-2.5 w-2/3 rounded bg-white/10" />
          <div className="h-9 w-9 rounded-md bg-white/10" />
        </div>
        <div className="h-7 w-1/2 rounded bg-white/10" />
        <div className="h-8 rounded bg-white/[0.04]" />
      </div>
    </CardContent>
  </Card>
);

const SkeletonChart = () => (
  <Card className="on-card">
    <CardContent className="p-5">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-1/3 rounded bg-white/10" />
        <div className="h-[200px] rounded bg-white/[0.04]" />
      </div>
    </CardContent>
  </Card>
);

const ChartEmpty = ({ icon: Icon, label }: { icon: LucideIcon; label: string }) => (
  <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
    <Icon className="h-8 w-8 text-muted-foreground/30" />
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

// ─── activity icon mapping (ícone semântico por tipo de ação) ─────────────────

const activityVisual = (acao: string): { icon: LucideIcon; accent: Accent } => {
  const a = (acao || '').toLowerCase();
  if (a.includes('login') || a.includes('acesso') || a.includes('dashboard'))
    return { icon: LogIn, accent: 'blue' };
  if (a.includes('correspond') || a.includes('email') || a.includes('e-mail'))
    return { icon: Mail, accent: 'lime' };
  if (a.includes('pagamento') || a.includes('fatura') || a.includes('cobr'))
    return { icon: CreditCard, accent: 'lime' };
  if (a.includes('documento')) return { icon: FileText, accent: 'amber' };
  if (a.includes('cliente') || a.includes('cadastr')) return { icon: UserPlus, accent: 'blue' };
  return { icon: Activity, accent: 'neutral' };
};

// ─── status breakdown (barra segmentada acessível) ────────────────────────────

const STATUS_META = [
  { key: 'paga', label: 'Pagas', color: '#60FF00' },
  { key: 'aberta', label: 'Abertas', color: '#3B82F6' },
  { key: 'vencida', label: 'Vencidas', color: '#F87171' },
  { key: 'cancelada', label: 'Canceladas', color: '#6B7280' },
] as const;

// ─── main component ──────────────────────────────────────────────────────────

const AdminOverview = () => {
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } =
    useAdminDataWithFallback();

  const {
    faturas,
    mrrCentavos,
    clientesAtivos,
    inadimplentes,
    inadimplenciaCentavos,
    assinaturasEmAtraso,
    loading: finLoading,
    error: finError,
    refetch: refetchFin,
  } = useAdminFinanceiro();

  const {
    clientGrowth,
    correspondencesMonthly,
    planDistribution,
    categoryDistribution,
    pessoaSplit,
    totalCorrespondencias,
    loading: insLoading,
    refetch: refetchInsights,
  } = useAdminInsights();

  const { activities: recentActivities, isLoading: activitiesLoading, refetch: refetchActivities } =
    useRecentActivities();

  const { items: recentCorrespondences, loading: corrLoading, refetch: refetchCorr } =
    useRecentCorrespondences(6);

  const { user } = useAuth();
  const navigate = useNavigate();

  const [refreshing, setRefreshing] = React.useState(false);
  const loading = statsLoading || finLoading;

  const handleRefresh = () => {
    setRefreshing(true);
    refetchStats();
    refetchFin();
    refetchInsights();
    refetchActivities();
    refetchCorr();
    setTimeout(() => setRefreshing(false), 700);
  };

  // ── Receita: últimos 6 meses de faturas pagas ────────────────────────────
  const revenueData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const receita = faturas
        .filter((f) => f.status === 'paga' && (f.pagaEm || f.criadaEm))
        .reduce((sum, f) => {
          const pd = new Date(f.pagaEm || f.criadaEm || '');
          return pd.getFullYear() === yr && pd.getMonth() === mo
            ? sum + f.valorCentavos
            : sum;
        }, 0);
      return { mes: format(d, 'MMM', { locale: ptBR }), receita: receita / 100 };
    });
  }, [faturas]);

  // Variação real mês-a-mês da receita paga (último mês vs penúltimo) — sem invenção.
  const revenueDelta = useMemo<number | null>(() => {
    if (revenueData.length < 2) return null;
    const atual = revenueData[revenueData.length - 1].receita;
    const anterior = revenueData[revenueData.length - 2].receita;
    if (anterior <= 0) return atual > 0 ? 100 : null;
    return ((atual - anterior) / anterior) * 100;
  }, [revenueData]);

  const revenueSpark = useMemo(() => revenueData.map((d) => d.receita), [revenueData]);

  // ── Distribuição de status de faturas ─────────────────────────────────────
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = { paga: 0, aberta: 0, vencida: 0, cancelada: 0 };
    faturas.forEach((f) => { counts[f.status] = (counts[f.status] ?? 0) + 1; });
    const total = faturas.length || 0;
    return STATUS_META.map((s) => ({
      ...s,
      count: counts[s.key] ?? 0,
      pct: total > 0 ? ((counts[s.key] ?? 0) / total) * 100 : 0,
    }));
  }, [faturas]);

  // ── Próximos vencimentos (faturas abertas a vencer, ordem crescente) ───────
  const proximosVencimentos = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return faturas
      .filter((f) => f.status === 'aberta' && f.vencimento)
      .map((f) => ({ fatura: f, venc: new Date(f.vencimento as string) }))
      .filter((x) => !Number.isNaN(x.venc.getTime()) && x.venc.getTime() >= hoje.getTime())
      .sort((a, b) => a.venc.getTime() - b.venc.getTime())
      .slice(0, 5);
  }, [faturas]);

  const totalFaturas = faturas.length;
  const totalClientes = stats?.totalClientes ?? 0;
  const correspondenciasHoje = stats?.correspondenciasHoje ?? 0;
  const taxaAdimplencia = stats?.taxaAdimplencia ?? 0;
  const error = statsError || finError;

  const planTotal = useMemo(
    () => planDistribution.reduce((s, p) => s + p.count, 0),
    [planDistribution],
  );
  const categoryMax = useMemo(
    () => Math.max(1, ...categoryDistribution.map((c) => c.count)),
    [categoryDistribution],
  );
  const pessoaTotal = pessoaSplit.pf + pessoaSplit.pj;

  const firstName = (user?.name || '').trim().split(' ')[0];

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse space-y-2">
            <div className="h-6 w-40 rounded bg-white/10" />
            <div className="h-3 w-64 rounded bg-white/10" />
          </div>
          <div className="h-8 w-24 animate-pulse rounded bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3"><SkeletonChart /></div>
          <div className="lg:col-span-2"><SkeletonChart /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {firstName ? `Olá, ${firstName}` : 'Dashboard'}
          </h1>
          <p className="mt-0.5 text-sm capitalize text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="cursor-pointer gap-2 self-start transition-colors duration-150 sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* ── Error alert ────────────────────────────────────────────────── */}
      {error && (
        <Alert className="border-destructive/30 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {/* ── KPI primários (4) — métricas que movem o negócio ───────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="MRR"
          value={brl(mrrCentavos)}
          icon={TrendingUp}
          accent="lime"
          delta={revenueDelta}
          deltaLabel="vs. mês anterior"
          sub="receita recorrente"
          spark={revenueSpark}
        />
        <StatCard
          label="Clientes Ativos"
          value={clientesAtivos}
          icon={Users}
          accent="lime"
          sub={`de ${totalClientes} cadastrados`}
          onClick={() => navigate('/admin/clientes')}
        />
        <StatCard
          label="Inadimplência"
          value={brl(inadimplenciaCentavos)}
          icon={AlertTriangle}
          accent={inadimplenciaCentavos > 0 ? 'amber' : 'neutral'}
          sub={`${inadimplentes.length} cliente(s) com pendência`}
          onClick={() => navigate('/admin/financeiro')}
        />
        <StatCard
          label="Assinaturas em Atraso"
          value={assinaturasEmAtraso}
          icon={Clock}
          accent={assinaturasEmAtraso > 0 ? 'red' : 'neutral'}
          sub="assinaturas vencidas"
          onClick={() => navigate('/admin/financeiro')}
        />
      </div>

      {/* ── KPI secundários — contexto operacional, peso visual menor ───── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="on-card">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="on-tile h-9 w-9 bg-white/8 text-muted-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total de Clientes
              </p>
              <p className="font-dm text-lg font-bold leading-tight text-foreground">
                {totalClientes}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="on-card">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="on-tile h-9 w-9 bg-white/8 text-muted-foreground">
              <Mail className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Correspondências Hoje
              </p>
              <p className="font-dm text-lg font-bold leading-tight text-foreground">
                {correspondenciasHoje}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="on-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Taxa de Adimplência
              </p>
              <p className="font-dm text-sm font-bold text-on-lime">
                {taxaAdimplencia.toFixed(0)}%
              </p>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-on-lime transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, taxaAdimplencia))}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Ações Rápidas — launcher de navegação ──────────────────────── */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Ações Rápidas
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map(({ label, sub, path, icon: Icon, accent }) => {
            const a = ACCENTS[accent];
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-white/[0.08] bg-card p-4 text-left shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-on-lime/30 hover:shadow-[0_0_24px_rgba(96,255,0,0.10)]"
              >
                <div className="flex items-center justify-between">
                  <span className={`on-tile h-10 w-10 ${a.tile}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-on-lime" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight text-foreground">{label}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Charts A — Receita + Status de faturas ──────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        {/* Receita — últimos 6 meses */}
        <Card className="on-card lg:col-span-3">
          <CardHeader className="px-5 pb-2 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Receita</CardTitle>
                <CardDescription className="text-xs">Faturas pagas · últimos 6 meses</CardDescription>
              </div>
              {revenueDelta !== null && <DeltaBadge value={revenueDelta} />}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ChartContainer config={revenueChartConfig} className="h-[200px] w-full">
              <AreaChart data={revenueData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="limeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60FF00" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#60FF00" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${Number(v).toFixed(0)}`}
                  width={52}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(v) =>
                        Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      }
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="#60FF00"
                  strokeWidth={2}
                  fill="url(#limeGradient)"
                  dot={{ fill: '#60FF00', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#60FF00', strokeWidth: 0 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status de Faturas — barra segmentada + legenda acessível */}
        <Card className="on-card lg:col-span-2">
          <CardHeader className="px-5 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold">Status das Faturas</CardTitle>
            <CardDescription className="text-xs">
              {totalFaturas} fatura{totalFaturas !== 1 ? 's' : ''} no total
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {totalFaturas === 0 ? (
              <ChartEmpty icon={FileText} label="Nenhuma fatura emitida ainda" />
            ) : (
              <div className="flex h-[200px] flex-col">
                {/* Barra segmentada */}
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                  {statusBreakdown.map((s) =>
                    s.count > 0 ? (
                      <div
                        key={s.key}
                        className="h-full transition-[width] duration-500 first:rounded-l-full last:rounded-r-full"
                        style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                        title={`${s.label}: ${s.count}`}
                      />
                    ) : null,
                  )}
                </div>

                {/* Legenda */}
                <div className="mt-5 flex-1 space-y-3">
                  {statusBreakdown.map((s) => (
                    <div key={s.key} className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="flex-1 text-sm text-muted-foreground">{s.label}</span>
                      <span className="font-dm text-sm font-semibold text-foreground">{s.count}</span>
                      <span className="w-10 text-right font-dm text-xs text-muted-foreground/60">
                        {s.pct.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Charts B — Crescimento de clientes + Correspondências/mês ───── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Crescimento de clientes (acumulado) */}
        <Card className="on-card">
          <CardHeader className="px-5 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold">Crescimento de Clientes</CardTitle>
            <CardDescription className="text-xs">Base acumulada · últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {insLoading ? (
              <div className="h-[200px] animate-pulse rounded bg-white/[0.04]" />
            ) : clientGrowth.every((d) => d.total === 0) ? (
              <ChartEmpty icon={Users} label="Sem clientes no período" />
            ) : (
              <ChartContainer config={growthChartConfig} className="h-[200px] w-full">
                <AreaChart data={clientGrowth} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60FF00" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#60FF00" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#60FF00"
                    strokeWidth={2}
                    fill="url(#growthGradient)"
                    dot={{ fill: '#60FF00', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#60FF00', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Correspondências por mês */}
        <Card className="on-card">
          <CardHeader className="px-5 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold">Correspondências</CardTitle>
            <CardDescription className="text-xs">
              Volume recebido · {totalCorrespondencias} nos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {insLoading ? (
              <div className="h-[200px] animate-pulse rounded bg-white/[0.04]" />
            ) : correspondencesMonthly.every((d) => d.count === 0) ? (
              <ChartEmpty icon={Inbox} label="Nenhuma correspondência no período" />
            ) : (
              <ChartContainer config={corrChartConfig} className="h-[200px] w-full">
                <BarChart data={correspondencesMonthly} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Charts C — Distribuição por plano + Correspondências por categoria ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Distribuição por plano (donut + legenda) */}
        <Card className="on-card">
          <CardHeader className="px-5 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold">Distribuição por Plano</CardTitle>
            <CardDescription className="text-xs">Clientes ativos por plano contratado</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {insLoading ? (
              <div className="h-[200px] animate-pulse rounded bg-white/[0.04]" />
            ) : planTotal === 0 ? (
              <ChartEmpty icon={Users} label="Sem planos ativos" />
            ) : (
              <div className="flex items-center gap-5">
                <div className="relative h-[160px] w-[160px] flex-shrink-0">
                  <ChartContainer config={planChartConfig} className="h-full w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                      <Pie
                        data={planDistribution}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={52}
                        outerRadius={76}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {planDistribution.map((s) => (
                          <Cell key={s.label} fill={s.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-dm text-2xl font-bold leading-none text-foreground">
                      {planTotal}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      ativos
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                  {planDistribution.map((s) => (
                    <div key={s.label} className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="flex-1 truncate text-sm text-muted-foreground">{s.label}</span>
                      <span className="font-dm text-sm font-semibold text-foreground">{s.count}</span>
                      <span className="w-10 text-right font-dm text-xs text-muted-foreground/60">
                        {planTotal > 0 ? ((s.count / planTotal) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Correspondências por categoria (barras horizontais) */}
        <Card className="on-card">
          <CardHeader className="px-5 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold">Correspondências por Categoria</CardTitle>
            <CardDescription className="text-xs">Top categorias · últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {insLoading ? (
              <div className="h-[200px] animate-pulse rounded bg-white/[0.04]" />
            ) : categoryDistribution.length === 0 ? (
              <ChartEmpty icon={Inbox} label="Nenhuma correspondência no período" />
            ) : (
              <div className="flex min-h-[200px] flex-col justify-center gap-3.5">
                {categoryDistribution.map((c) => (
                  <div key={c.label}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="truncate text-sm text-foreground">{c.label}</span>
                      <span className="font-dm text-xs font-semibold text-muted-foreground">{c.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.04]">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${(c.count / categoryMax) * 100}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                ))}
                {pessoaTotal > 0 && (
                  <div className="mt-1 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-[11px] text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{pessoaSplit.pj} PJ</span>
                    <span className="text-muted-foreground/40">·</span>
                    <User className="h-3.5 w-3.5" />
                    <span>{pessoaSplit.pf} PF</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Últimas Correspondências (lista + ver mais) ─────────────────── */}
      <Card className="on-card">
        <CardHeader className="px-5 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-3.5 w-3.5 text-on-lime" />
                Últimas Correspondências
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">Entradas mais recentes</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer gap-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
              onClick={() => navigate('/admin/correspondencias')}
            >
              Ver mais <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          {corrLoading ? (
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex animate-pulse items-center gap-3 px-3 py-2.5">
                  <div className="h-8 w-8 flex-shrink-0 rounded-md bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-white/10" />
                    <div className="h-2 w-1/2 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentCorrespondences.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Inbox className="h-7 w-7 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhuma correspondência registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentCorrespondences.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate('/admin/correspondencias')}
                  className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.04]"
                >
                  <span className="on-tile mt-0.5 h-8 w-8 flex-shrink-0 bg-on-lime/12 text-on-lime">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {!c.visualizada && (
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-on-lime" title="Não lida" />
                      )}
                      <p className="truncate text-sm font-medium text-foreground">{c.assunto}</p>
                      {c.arquivo_url && (
                        <Paperclip className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.clienteNome} · {c.remetente}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-white/[0.06] px-2 py-px text-[10px] font-semibold text-muted-foreground">
                      {c.categoria}
                    </span>
                    <span className="font-dm text-[10px] text-muted-foreground/60">
                      {format(new Date(c.data_recebimento), 'dd/MM', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Inadimplentes + Próximos Vencimentos ────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Top inadimplentes */}
        <Card className="on-card">
          <CardHeader className="px-5 pb-3 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                  Maiores Inadimplentes
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Total em aberto: {brl(inadimplenciaCentavos)}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer gap-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
                onClick={() => navigate('/admin/financeiro')}
              >
                Ver todos <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {inadimplentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <span className="on-tile h-11 w-11 bg-on-lime/10 text-on-lime">
                  <CheckCircle className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground">Nenhum cliente inadimplente.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {inadimplentes.slice(0, 5).map((c) => (
                  <div
                    key={c.clienteId}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.05]"
                    onClick={() => navigate('/admin/financeiro')}
                  >
                    <span className="on-tile h-8 w-8 flex-shrink-0 bg-amber-400/12 text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight text-foreground">
                        {c.clienteNome}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{c.clienteEmail}</p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <p className="font-dm text-sm font-semibold text-foreground">
                        {brl(c.totalCentavos)}
                      </p>
                      <Badge
                        variant="outline"
                        className={`h-4 px-1.5 text-[10px] leading-none ${
                          c.diasAtraso >= 30
                            ? 'border-red-500/40 text-red-400'
                            : c.diasAtraso >= 7
                            ? 'border-amber-400/40 text-amber-300'
                            : 'border-amber-300/30 text-amber-200'
                        }`}
                      >
                        {c.diasAtraso}d atraso
                      </Badge>
                    </div>
                  </div>
                ))}
                {inadimplentes.length > 5 && (
                  <p className="pt-1 text-center text-xs text-muted-foreground">
                    + {inadimplentes.length - 5} outros
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos vencimentos — faturas abertas a vencer (contraponto ao inadimplente) */}
        <Card className="on-card">
          <CardHeader className="px-5 pb-3 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarClock className="h-3.5 w-3.5 text-blue-300" />
                  Próximos Vencimentos
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Faturas em aberto a vencer
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer gap-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
                onClick={() => navigate('/admin/financeiro')}
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {proximosVencimentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <span className="on-tile h-11 w-11 bg-white/[0.06] text-muted-foreground">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-foreground">Sem vencimentos próximos</p>
                <p className="text-xs text-muted-foreground">Nenhuma fatura em aberto a vencer.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {proximosVencimentos.map(({ fatura, venc }) => {
                  const dias = diasAteVencimento(venc);
                  const label = dias === 0 ? 'vence hoje' : dias === 1 ? 'vence amanhã' : `em ${dias} dias`;
                  const urgente = dias <= 3;
                  return (
                    <div
                      key={fatura.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.05]"
                      onClick={() => navigate('/admin/financeiro')}
                    >
                      <span
                        className={`on-tile h-8 w-8 flex-shrink-0 ${
                          urgente ? 'bg-amber-400/12 text-amber-300' : 'bg-blue-500/12 text-blue-300'
                        }`}
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight text-foreground">
                          {fatura.clienteNome}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {fatura.produtoNome && fatura.produtoNome !== '—'
                            ? fatura.produtoNome
                            : fatura.descricao || 'Fatura'}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        <p className="font-dm text-sm font-semibold text-foreground">
                          {brl(fatura.valorCentavos)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`h-4 px-1.5 text-[10px] leading-none ${
                            urgente
                              ? 'border-amber-400/40 text-amber-300'
                              : 'border-blue-400/30 text-blue-200'
                          }`}
                        >
                          {label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Activity Feed (logs reais da plataforma) ────────────────────── */}
      <Card className="on-card">
        <CardHeader className="px-5 pb-3 pt-5">
          <CardTitle className="text-sm font-semibold">Atividades Recentes</CardTitle>
          <CardDescription className="text-xs">Registro real de ações na plataforma</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          {activitiesLoading ? (
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex animate-pulse items-center gap-3 px-3 py-2.5">
                  <div className="h-8 w-8 flex-shrink-0 rounded-md bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-white/10" />
                    <div className="h-2 w-1/2 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Activity className="h-7 w-7 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentActivities.map((activity) => {
                const { icon: AIcon, accent } = activityVisual(activity.acao);
                const a = ACCENTS[accent];
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.04]"
                  >
                    <span className={`on-tile mt-0.5 h-8 w-8 flex-shrink-0 ${a.tile}`}>
                      <AIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {humanizarAcao(activity.acao)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{activity.descricao}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {/* Cliente relacionado — clicável abre a ficha */}
                        {activity.clienteId ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/clientes?cliente=${activity.clienteId}`)}
                            title={`Abrir ficha de ${activity.clienteNome}`}
                            className="flex cursor-pointer items-center gap-1 text-[10px] font-medium text-on-lime/90 transition-colors hover:text-on-lime"
                          >
                            <Building2 className="h-3 w-3" />
                            <span className="max-w-[160px] truncate">{activity.clienteNome}</span>
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                            <Building2 className="h-3 w-3" />
                            <span className="max-w-[160px] truncate">{activity.clienteNome}</span>
                          </span>
                        )}
                        {/* Ator — quem realizou a ação (ou automática) */}
                        {activity.atorTipo === 'sistema' ? (
                          <span
                            className="flex items-center gap-1 text-[10px] text-muted-foreground/60"
                            title="Ação automática do sistema"
                          >
                            <Bot className="h-3 w-3" /> Automático
                          </span>
                        ) : activity.atorNome ? (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                            <User className="h-3 w-3" />
                            por {activity.atorNome}
                            {activity.atorTipo === 'admin'
                              ? ' · equipe'
                              : activity.atorTipo === 'cliente'
                              ? ' · cliente'
                              : ''}
                          </span>
                        ) : (
                          <span
                            className="flex items-center gap-1 text-[10px] text-muted-foreground/40"
                            title="Autor não registrado (atividade anterior à atualização)"
                          >
                            <User className="h-3 w-3" /> autor não registrado
                          </span>
                        )}
                        {/* Data */}
                        <span className="flex items-center gap-1 font-dm text-[10px] text-muted-foreground/60">
                          <Clock className="h-3 w-3" />
                          {format(new Date(activity.data_atividade), 'dd/MM HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default AdminOverview;
