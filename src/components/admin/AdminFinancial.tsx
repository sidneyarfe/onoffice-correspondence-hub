import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowDownToLine,
  Bell,
  CreditCard,
  DollarSign,
  Receipt,
  RefreshCw,
  Repeat,
  Search,
  TrendingUp,
} from 'lucide-react';
import { useAdminFinanceiro, FaturaStatus, FinFatura, FinInadimplente } from '@/hooks/useAdminFinanceiro';
import FaturaModal, { FaturaGerencia } from '@/components/admin/clientes/FaturaModal';
import { brlCentavos } from '@/components/admin/clientes/clientesShared';
import { notificarCliente } from '@/utils/notificacao';
import { registrarAtividade } from '@/utils/atividade';
import { useToast } from '@/hooks/use-toast';

type Period = 'month' | 'quarter' | 'year' | 'all';
type SortKey = 'codigo' | 'cliente' | 'valor' | 'venc' | 'status';
interface Sort {
  key: SortKey;
  dir: 'asc' | 'desc';
}

const iconBtn =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground';

const STATUS_PILL: Record<FaturaStatus, string> = {
  paga: 'bg-on-lime/15 text-on-lime',
  aberta: 'bg-orange-400/15 text-orange-300',
  vencida: 'bg-red-500/15 text-red-300',
  cancelada: 'bg-white/[0.07] text-muted-foreground',
};
const STATUS_DOT: Record<FaturaStatus, string> = {
  paga: 'bg-on-lime',
  aberta: 'bg-orange-400',
  vencida: 'bg-red-400',
  cancelada: 'bg-white/40',
};
const STATUS_LABEL: Record<FaturaStatus, string> = {
  paga: 'Paga',
  aberta: 'Em aberto',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
};

const PERIOD_LABEL: Record<Period, string> = {
  month: 'este mês',
  quarter: 'este trimestre',
  year: 'este ano',
  all: 'todo o período',
};

const periodStart = (p: Period): number => {
  const now = new Date();
  switch (p) {
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    case 'quarter':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
    case 'year':
      return new Date(now.getFullYear(), 0, 1).getTime();
    default:
      return 0;
  }
};

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

const AdminFinancial = () => {
  const {
    faturas,
    mrrCentavos,
    clientesAtivos,
    avulsos,
    inadimplentes,
    inadimplenciaCentavos,
    assinaturasEmAtraso,
    loading,
    error,
    refetch,
  } = useAdminFinanceiro();
  const { toast } = useToast();

  const [period, setPeriod] = useState<Period>('month');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FaturaStatus>('all');
  const [sort, setSort] = useState<Sort>({ key: 'venc', dir: 'desc' });

  const [faturaSel, setFaturaSel] = useState<FinFatura | null>(null);
  const [notifLoading, setNotifLoading] = useState<string | null>(null);

  const start = periodStart(period);

  // ---- KPIs do período (derivados; sem refetch ao trocar período) -----------
  const kpis = useMemo(() => {
    const recebidas = faturas.filter((f) => {
      if (f.status !== 'paga') return false;
      const t = new Date(f.pagaEm ?? f.criadaEm ?? '').getTime();
      return Number.isNaN(t) ? start === 0 : t >= start;
    });
    const receitaRecebida = recebidas.reduce((s, f) => s + f.valorCentavos, 0);
    const emAberto = faturas.filter((f) => f.status === 'aberta');
    const emAbertoTotal = emAberto.reduce((s, f) => s + f.valorCentavos, 0);
    const avulsosPeriodo = avulsos
      .filter((a) => {
        const t = new Date(a.data ?? '').getTime();
        return Number.isNaN(t) ? start === 0 : t >= start;
      })
      .reduce((s, a) => s + a.centavos, 0);
    return {
      receitaRecebida,
      faturasPagas: recebidas.length,
      emAbertoTotal,
      emAbertoQtd: emAberto.length,
      avulsosPeriodo,
      ticketMedio: recebidas.length ? Math.round(receitaRecebida / recebidas.length) : 0,
      faturamentoPeriodo: receitaRecebida + avulsosPeriodo,
    };
  }, [faturas, avulsos, start]);

  // ---- Receita por produto (faturas pagas no período) -----------------------
  const receitaPorProduto = useMemo(() => {
    const mapa = new Map<string, number>();
    faturas.forEach((f) => {
      if (f.status !== 'paga') return;
      const t = new Date(f.pagaEm ?? f.criadaEm ?? '').getTime();
      const dentro = Number.isNaN(t) ? start === 0 : t >= start;
      if (!dentro) return;
      mapa.set(f.produtoNome, (mapa.get(f.produtoNome) ?? 0) + f.valorCentavos);
    });
    const arr = [...mapa.entries()].map(([produto, centavos]) => ({ produto, centavos }));
    arr.sort((a, b) => b.centavos - a.centavos);
    const max = arr.reduce((m, x) => Math.max(m, x.centavos), 0);
    return { arr: arr.slice(0, 6), max };
  }, [faturas, start]);

  // ---- Tabela: busca + filtro + ordenação -----------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const dir = sort.dir === 'asc' ? 1 : -1;
    return faturas
      .filter((f) => {
        const matchesSearch =
          !q ||
          f.clienteNome.toLowerCase().includes(q) ||
          f.clienteEmail.toLowerCase().includes(q) ||
          f.codigo.toLowerCase().includes(q) ||
          (f.descricao ?? '').toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let av: string | number;
        let bv: string | number;
        switch (sort.key) {
          case 'cliente': av = a.clienteNome.toLowerCase(); bv = b.clienteNome.toLowerCase(); break;
          case 'valor': av = a.valorCentavos; bv = b.valorCentavos; break;
          case 'status': av = a.status; bv = b.status; break;
          case 'venc': av = new Date(a.vencimento ?? a.criadaEm ?? 0).getTime(); bv = new Date(b.vencimento ?? b.criadaEm ?? 0).getTime(); break;
          default: av = a.codigo.toLowerCase(); bv = b.codigo.toLowerCase();
        }
        return av < bv ? -dir : av > bv ? dir : 0;
      });
  }, [faturas, search, statusFilter, sort]);

  const hasFilters = search.trim() !== '' || statusFilter !== 'all';
  const onSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? '↑' : '↓') : '');

  const handleNotificar = async (inad: FinInadimplente) => {
    if (!inad.userId) {
      toast({ title: 'Cliente sem acesso', description: 'Só é possível notificar após o cliente ter usuário criado.', variant: 'destructive' });
      return;
    }
    setNotifLoading(inad.clienteId);
    try {
      await notificarCliente(
        inad.userId,
        'Cobranças em atraso — ON Office',
        `Você tem ${inad.qtd} cobrança(s) em atraso totalizando ${brlCentavos(inad.totalCentavos)}. Regularize para manter seu endereço fiscal ativo.`,
        { interna: true, email: false },
      );
      await registrarAtividade(inad.userId, 'cobranca_notificada', `Lembrete de inadimplência (${inad.qtd} cobrança(s), ${brlCentavos(inad.totalCentavos)}) enviado (admin)`);
      toast({ title: 'Cliente notificado', description: `${inad.clienteNome} recebeu o lembrete na plataforma.` });
    } catch {
      toast({ title: 'Erro ao notificar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setNotifLoading(null);
    }
  };

  const exportarCSV = () => {
    const head = ['Codigo', 'Cliente', 'Email', 'Produto', 'Descricao', 'Valor', 'Vencimento', 'Pagamento', 'Status'];
    const linhas = filtered.map((f) => [
      f.codigo,
      f.clienteNome,
      f.clienteEmail,
      f.produtoNome,
      (f.descricao ?? '').replace(/\s+/g, ' '),
      (f.valorCentavos / 100).toFixed(2).replace('.', ','),
      fmtDate(f.vencimento),
      fmtDate(f.pagaEm),
      STATUS_LABEL[f.status],
    ]);
    const csv = [head, ...linhas]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro-onoffice-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // FaturaGerencia para o modal reutilizado da ficha do cliente
  const faturaGerencia: FaturaGerencia | null = faturaSel
    ? {
        id: faturaSel.id,
        codigo: faturaSel.codigo,
        periodoLabel: faturaSel.periodoLabel,
        valorCentavos: faturaSel.valorCentavos,
        vencimento: faturaSel.vencimento,
        status: faturaSel.status,
        produtoNome: faturaSel.produtoNome,
      }
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-on-lime" />
          <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-400">Erro ao carregar dados financeiros: {error}</p>
        <button onClick={refetch} className="on-button inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  const kpiCards = [
    {
      label: `Receita recebida (${PERIOD_LABEL[period]})`,
      value: brlCentavos(kpis.receitaRecebida),
      sub: (<><span className="on-num">{kpis.faturasPagas}</span> fatura(s) paga(s)</>),
      icon: DollarSign,
      tone: 'text-on-lime',
      bg: 'bg-on-lime/10',
    },
    {
      label: 'Receita recorrente (MRR)',
      value: brlCentavos(mrrCentavos),
      sub: (<><span className="on-num">{clientesAtivos}</span> cliente(s) ativo(s)</>),
      icon: Repeat,
      tone: 'text-blue-300',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Em aberto',
      value: brlCentavos(kpis.emAbertoTotal),
      sub: (<><span className="on-num">{kpis.emAbertoQtd}</span> fatura(s) a vencer</>),
      icon: CreditCard,
      tone: 'text-orange-300',
      bg: 'bg-orange-400/10',
    },
    {
      label: 'Inadimplência',
      value: brlCentavos(inadimplenciaCentavos),
      sub: (
        <>
          <span className="on-num">{assinaturasEmAtraso}</span> assinatura(s) em atraso ·{' '}
          <span className="on-num">{inadimplentes.length}</span> cliente(s)
        </>
      ),
      icon: AlertTriangle,
      tone: 'text-red-300',
      bg: 'bg-red-500/10',
    },
  ];

  const miniStats = [
    { label: `Faturamento ${PERIOD_LABEL[period]}`, value: brlCentavos(kpis.faturamentoPeriodo), color: 'text-foreground' },
    { label: 'Ticket médio', value: brlCentavos(kpis.ticketMedio), color: 'text-foreground' },
    { label: `Avulsos ${PERIOD_LABEL[period]}`, value: brlCentavos(kpis.avulsosPeriodo), color: 'text-purple-300' },
    { label: 'Clientes ativos', value: String(clientesAtivos), color: 'text-on-lime' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Financeiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">Receita, cobranças e inadimplência em tempo real</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-10 w-[160px] border-white/10 bg-[#0e0e11]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={exportarCSV} className={`${iconBtn} h-10 w-auto gap-2 px-3 text-[13px]`} title="Exportar CSV">
            <ArrowDownToLine className="h-4 w-4" /> Exportar
          </button>
          <button onClick={refetch} className={`${iconBtn} h-10 w-auto gap-2 px-3 text-[13px]`} title="Atualizar">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/[0.08] bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12.5px] text-muted-foreground">{k.label}</p>
                <p className={`on-num mt-1.5 text-[26px] font-semibold leading-none ${k.tone}`}>{k.value}</p>
                <p className="mt-2 text-[11.5px] text-muted-foreground/80">{k.sub}</p>
              </div>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.bg} ${k.tone}`}>
                <k.icon className="h-5 w-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Mini stats */}
      <div className="flex flex-wrap gap-2.5">
        {miniStats.map((s) => (
          <div key={s.label} className="min-w-[150px] flex-1 rounded-xl border border-white/[0.08] bg-card px-4 py-3">
            <div className={`on-num text-[19px] font-medium leading-none ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Receita por produto + Inadimplentes */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {/* Receita por produto */}
        <div className="rounded-2xl border border-white/[0.08] bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-[18px] w-[18px] text-on-lime" />
            <h2 className="text-[15px] font-bold">Receita por produto</h2>
            <span className="ml-auto text-[11.5px] text-muted-foreground">{PERIOD_LABEL[period]}</span>
          </div>
          {receitaPorProduto.arr.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-muted-foreground/70">Nenhuma receita registrada no período.</div>
          ) : (
            <div className="space-y-3">
              {receitaPorProduto.arr.map((p) => (
                <div key={p.produto}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="truncate text-foreground/90">{p.produto}</span>
                    <span className="on-num shrink-0 font-medium text-on-lime">{brlCentavos(p.centavos)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-on-lime/80 transition-all"
                      style={{ width: `${receitaPorProduto.max ? (p.centavos / receitaPorProduto.max) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inadimplentes */}
        <div className="rounded-2xl border border-white/[0.08] bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-[18px] w-[18px] text-red-300" />
            <h2 className="text-[15px] font-bold">Inadimplentes</h2>
            {inadimplentes.length > 0 && (
              <span className="on-pill ml-auto bg-red-500/15 text-[11px] text-red-300">
                {brlCentavos(inadimplenciaCentavos)}
              </span>
            )}
          </div>
          {inadimplentes.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-muted-foreground/70">Nenhuma cobrança em atraso no momento.</div>
          ) : (
            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {inadimplentes.map((inad) => {
                const temFatura = !!inad.faturaMaisAntiga;
                return (
                  <div
                    key={inad.clienteId}
                    className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-3.5 py-2.5"
                  >
                    <button
                      onClick={() => inad.faturaMaisAntiga && setFaturaSel(inad.faturaMaisAntiga)}
                      disabled={!temFatura}
                      className={`min-w-0 flex-1 text-left ${temFatura ? 'cursor-pointer' : 'cursor-default'}`}
                      title={temFatura ? 'Gerenciar fatura vencida mais antiga' : 'Assinatura vencida sem fatura emitida'}
                    >
                      <div className="truncate text-[13px] font-semibold">{inad.clienteNome}</div>
                      <div className="truncate text-[11.5px] text-muted-foreground/80">
                        <span className="on-num">{inad.qtd}</span> cobrança(s) ·{' '}
                        <span className="on-num">{inad.diasAtraso}</span> dia(s) em atraso
                      </div>
                    </button>
                    <div className="shrink-0 text-right">
                      <div className="on-num text-[13.5px] font-bold text-red-300">{brlCentavos(inad.totalCentavos)}</div>
                    </div>
                    <button
                      onClick={() => handleNotificar(inad)}
                      disabled={notifLoading === inad.clienteId}
                      className={`${iconBtn} shrink-0 hover:border-red-500/50 hover:text-red-300 disabled:opacity-50`}
                      title="Notificar cliente"
                    >
                      <Bell className="h-[15px] w-[15px]" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Busca + filtro */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            placeholder="Buscar por cliente, código ou descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 border-white/10 bg-[#0e0e11] pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | FaturaStatus)}>
          <SelectTrigger className="h-10 w-[170px] border-white/10 bg-[#0e0e11]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="aberta">Em aberto</SelectItem>
            <SelectItem value="vencida">Vencidas</SelectItem>
            <SelectItem value="paga">Pagas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
            className="inline-flex h-10 items-center rounded-lg border border-white/10 px-3 text-[13px] text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="text-[13.5px] text-muted-foreground">
        <span className="on-num text-foreground">{filtered.length}</span> de{' '}
        <span className="on-num">{faturas.length}</span> faturas
      </div>

      {/* Tabela de faturas */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="bg-[#0e0e11]">
                {([
                  ['Fatura', 'codigo'],
                  ['Cliente', 'cliente'],
                  ['Valor', 'valor'],
                  ['Vencimento', 'venc'],
                  ['Status', 'status'],
                ] as [string, SortKey][]).map(([label, key]) => (
                  <th key={key} className="select-none whitespace-nowrap px-4 py-3 text-left">
                    <button
                      onClick={() => onSort(key)}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label} <span className="on-num text-[11px] text-on-lime">{arrow(key)}</span>
                    </button>
                  </th>
                ))}
                <th className="w-[80px] px-4 py-3 text-right text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => setFaturaSel(f)}
                  className="cursor-pointer border-t border-white/[0.05] transition-colors hover:bg-white/[0.025]"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
                        <Receipt className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="on-num max-w-[190px] truncate text-[13px] font-semibold">{f.codigo}</div>
                        <div className="mt-0.5 max-w-[190px] truncate text-[11.5px] text-muted-foreground/80">
                          {f.descricao || f.produtoNome}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="max-w-[200px] truncate text-[13px]">{f.clienteNome}</div>
                    <div className="truncate text-[11.5px] text-muted-foreground/80">{f.clienteEmail}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="on-num text-[13.5px] font-medium">{brlCentavos(f.valorCentavos)}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="on-num text-[12.5px] text-muted-foreground">{fmtDate(f.vencimento)}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`on-pill text-[11px] ${STATUS_PILL[f.status]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[f.status]}`} />
                      {STATUS_LABEL[f.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end">
                      <button className={iconBtn} title="Gerenciar fatura" onClick={() => setFaturaSel(f)}>
                        <CreditCard className="h-[15px] w-[15px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-muted-foreground">
            {hasFilters ? 'Nenhuma fatura com esses filtros. Tente limpar a busca.' : 'Nenhuma fatura registrada ainda.'}
          </div>
        )}
      </div>

      {/* Modal de gestão da fatura (reutiliza o da ficha do cliente) */}
      <FaturaModal
        isOpen={!!faturaSel}
        onClose={() => setFaturaSel(null)}
        fatura={faturaGerencia}
        assinatura={null}
        cliente={faturaSel ? { nome: faturaSel.clienteNome, email: faturaSel.clienteEmail } : null}
        userId={faturaSel?.userId}
        onDone={refetch}
      />
    </div>
  );
};

export default AdminFinancial;
