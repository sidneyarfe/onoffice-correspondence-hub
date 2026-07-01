import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { codigoFatura } from '@/components/admin/clientes/clienteStatus';
import { calcularProximoVencimento } from '@/utils/vencimento';
import { useRealtimeRefetch } from './useRealtimeRefetch';

// ============================================================================
// Financeiro (admin) — visão consolidada e REAL sobre o modelo Epic 005:
//   `faturas` (view sobre `pagamentos`) é a fonte da verdade de cobrança;
//   `assinaturas` dá a receita recorrente (MRR) e a INADIMPLÊNCIA (toda assinatura
//   vencida — vencimento no passado OU com fatura vencida — entra no KPI);
//   `pedidos`/`pedido_itens`, os avulsos.
// O hook é agnóstico ao período: a UI deriva os KPIs de período (sem refetch ao
// trocar o filtro). Inadimplência é estado atual → calculada aqui. Realtime ao vivo.
// ============================================================================

export type FaturaStatus = 'aberta' | 'paga' | 'vencida' | 'cancelada';

export interface FinFatura {
  id: string;
  codigo: string;
  clienteId: string | null;
  clienteNome: string;
  clienteEmail: string;
  userId: string | null;
  produtoNome: string;
  /** período cobrado (início → fim) derivado da emissão + periodicidade da assinatura */
  periodoLabel: string;
  valorCentavos: number;
  descricao: string | null;
  vencimento: string | null;
  pagaEm: string | null;
  criadaEm: string | null;
  status: FaturaStatus;
}

export interface FinInadimplente {
  clienteId: string;
  clienteNome: string;
  clienteEmail: string;
  userId: string | null;
  totalCentavos: number;
  /** itens em atraso (assinaturas vencidas + faturas avulsas vencidas) */
  qtd: number;
  diasAtraso: number;
  /** fatura vencida mais antiga (para abrir no modal de gestão); null se só vencido por data */
  faturaMaisAntiga: FinFatura | null;
}

export interface FinAvulso {
  centavos: number;
  data: string | null;
}

interface AdminFinanceiroData {
  faturas: FinFatura[];
  /** Receita recorrente mensal estimada (assinaturas ativas, normalizadas p/ mês), em centavos. */
  mrrCentavos: number;
  /** Clientes com ao menos uma assinatura ativa. */
  clientesAtivos: number;
  /** Itens de pedidos avulsos pagos (para receita por período). */
  avulsos: FinAvulso[];
  /** Inadimplentes agrupados por cliente (toda assinatura vencida conta). */
  inadimplentes: FinInadimplente[];
  /** Total inadimplente (Σ assinaturas vencidas + faturas avulsas vencidas), em centavos. */
  inadimplenciaCentavos: number;
  /** Quantidade de assinaturas em atraso. */
  assinaturasEmAtraso: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Meses equivalentes de uma periodicidade — usado para normalizar a receita recorrente p/ MRR. */
const MESES_POR_PERIODICIDADE: Record<string, number> = {
  semanal: 7 / 30.44,
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
  bianual: 24,
};

const normalizarStatus = (s: string | null): FaturaStatus => {
  switch (s) {
    case 'paga':
    case 'vencida':
    case 'cancelada':
      return s;
    default:
      return 'aberta';
  }
};

const periodoLabelDe = (criadaEm: string | null, periodicidade: string | null | undefined): string => {
  if (!criadaEm) return '—';
  const inicio = new Date(criadaEm);
  if (Number.isNaN(inicio.getTime())) return '—';
  const fim = calcularProximoVencimento(inicio, periodicidade);
  return `${inicio.toLocaleDateString('pt-BR')} → ${fim.toLocaleDateString('pt-BR')}`;
};

const diasDesde = (s: string | null): number => {
  if (!s) return 0;
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
};

export const useAdminFinanceiro = (): AdminFinanceiroData => {
  const [faturas, setFaturas] = useState<FinFatura[]>([]);
  const [mrrCentavos, setMrrCentavos] = useState(0);
  const [clientesAtivos, setClientesAtivos] = useState(0);
  const [avulsos, setAvulsos] = useState<FinAvulso[]>([]);
  const [inadimplentes, setInadimplentes] = useState<FinInadimplente[]>([]);
  const [inadimplenciaCentavos, setInadimplenciaCentavos] = useState(0);
  const [assinaturasEmAtraso, setAssinaturasEmAtraso] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [cliRes, assRes, fatRes] = await Promise.all([
        supabase
          .from('contratacoes_clientes')
          .select('id, razao_social, nome_responsavel, email, user_id, produto_selecionado'),
        supabase
          .from('assinaturas')
          .select(
            'id, cliente_id, status, proximo_vencimento, preco_snapshot_centavos, ' +
              'planos:plano_id ( periodicidade, preco_em_centavos ), produtos:produto_id ( nome_produto )',
          ),
        supabase
          .from('faturas')
          .select('id, cliente_id, assinatura_id, user_id, valor_centavos, descricao, vencimento, paga_em, status, created_at')
          .order('created_at', { ascending: false }),
      ]);

      if (cliRes.error) throw cliRes.error;
      if (fatRes.error) throw fatRes.error;

      const cliRows = (cliRes.data ?? []) as Array<{
        id: string;
        razao_social: string | null;
        nome_responsavel: string | null;
        email: string | null;
        user_id: string | null;
        produto_selecionado: string | null;
      }>;
      const clienteById = new Map(cliRows.map((c) => [c.id, c]));
      const nomeCliente = (id: string | null) => {
        const c = id ? clienteById.get(id) : undefined;
        return {
          nome: c?.razao_social || c?.nome_responsavel || 'Cliente não identificado',
          email: c?.email || '',
          userId: c?.user_id ?? null,
        };
      };

      const assRows = (assRes.data ?? []) as Array<{
        id: string;
        cliente_id: string;
        status: string;
        proximo_vencimento: string | null;
        preco_snapshot_centavos: number | null;
        planos: { periodicidade?: string | null; preco_em_centavos?: number | null } | null;
        produtos: { nome_produto?: string | null } | null;
      }>;
      const periodicidadePorAss = new Map<string, string | null>();
      const produtoPorAss = new Map<string, string>();
      assRows.forEach((a) => {
        periodicidadePorAss.set(a.id, a.planos?.periodicidade ?? null);
        if (a.produtos?.nome_produto) produtoPorAss.set(a.id, a.produtos.nome_produto);
      });

      // MRR + clientes ativos (assinaturas com status persistido 'ativo')
      const ativos = assRows.filter((a) => a.status === 'ativo');
      const mrr = ativos.reduce((soma, a) => {
        const preco = a.preco_snapshot_centavos ?? a.planos?.preco_em_centavos ?? 0;
        const meses = MESES_POR_PERIODICIDADE[a.planos?.periodicidade ?? 'anual'] ?? 12;
        return soma + (meses > 0 ? preco / meses : preco);
      }, 0);
      setMrrCentavos(Math.round(mrr));
      setClientesAtivos(new Set(ativos.map((a) => a.cliente_id)).size);

      // ---- Faturas enriquecidas -------------------------------------------------
      const fatRows = (fatRes.data ?? []) as Array<{
        id: string;
        cliente_id: string | null;
        assinatura_id: string | null;
        user_id: string | null;
        valor_centavos: number | null;
        descricao: string | null;
        vencimento: string | null;
        paga_em: string | null;
        status: string | null;
        created_at: string | null;
      }>;

      const finFaturas: FinFatura[] = fatRows.map((f) => {
        const c = nomeCliente(f.cliente_id);
        const produtoNome =
          (f.assinatura_id ? produtoPorAss.get(f.assinatura_id) : undefined) ||
          (f.cliente_id ? clienteById.get(f.cliente_id)?.produto_selecionado : undefined) ||
          '';
        const periodicidade = f.assinatura_id ? periodicidadePorAss.get(f.assinatura_id) : null;
        return {
          id: f.id,
          codigo: codigoFatura(f.id, produtoNome, f.created_at),
          clienteId: f.cliente_id,
          clienteNome: c.nome,
          clienteEmail: c.email,
          userId: f.user_id ?? c.userId,
          produtoNome: produtoNome || '—',
          periodoLabel: periodoLabelDe(f.created_at, periodicidade),
          valorCentavos: f.valor_centavos ?? 0,
          descricao: f.descricao,
          vencimento: f.vencimento,
          pagaEm: f.paga_em,
          criadaEm: f.created_at,
          status: normalizarStatus(f.status),
        };
      });
      setFaturas(finFaturas);

      // ---- Inadimplência: assinatura-cêntrica ----------------------------------
      // vencida fatura (status='vencida') por assinatura: soma + a mais antiga
      const vencidasPorAss = new Map<string, { soma: number; maisAntiga: FinFatura }>();
      const vencidasAvulsas: FinFatura[] = []; // vencidas sem assinatura
      // mapeia via assinatura_id da linha original (finFaturas[i] é 1:1 com fatRows[i])
      fatRows.forEach((row, i) => {
        const f = finFaturas[i];
        if (f.status !== 'vencida') return;
        if (row.assinatura_id) {
          const cur = vencidasPorAss.get(row.assinatura_id);
          if (cur) {
            cur.soma += f.valorCentavos;
            if (new Date(f.vencimento ?? 0).getTime() < new Date(cur.maisAntiga.vencimento ?? 0).getTime()) cur.maisAntiga = f;
          } else {
            vencidasPorAss.set(row.assinatura_id, { soma: f.valorCentavos, maisAntiga: f });
          }
        } else {
          vencidasAvulsas.push(f);
        }
      });

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const overduePorData = (pv: string | null) => {
        if (!pv) return false;
        const t = new Date(pv).getTime();
        return !Number.isNaN(t) && t < hoje.getTime();
      };

      const buckets = new Map<string, FinInadimplente>();
      const add = (
        clienteId: string,
        centavos: number,
        dias: number,
        fatura: FinFatura | null,
      ) => {
        const info = nomeCliente(clienteId);
        const cur = buckets.get(clienteId);
        if (cur) {
          cur.totalCentavos += centavos;
          cur.qtd += 1;
          cur.diasAtraso = Math.max(cur.diasAtraso, dias);
          if (fatura && (!cur.faturaMaisAntiga || new Date(fatura.vencimento ?? 0).getTime() < new Date(cur.faturaMaisAntiga.vencimento ?? 0).getTime())) {
            cur.faturaMaisAntiga = fatura;
          }
        } else {
          buckets.set(clienteId, {
            clienteId,
            clienteNome: info.nome,
            clienteEmail: info.email,
            userId: info.userId,
            totalCentavos: centavos,
            qtd: 1,
            diasAtraso: dias,
            faturaMaisAntiga: fatura,
          });
        }
      };

      let totalInadimplente = 0;
      let qtdAssEmAtraso = 0;
      // assinaturas vivas (não canceladas/suspensas) e vencidas
      assRows.forEach((a) => {
        if (a.status === 'cancelado' || a.status === 'suspenso') return;
        const vencidas = vencidasPorAss.get(a.id);
        const overdueData = overduePorData(a.proximo_vencimento);
        const emAtraso = !!vencidas || overdueData;
        if (!emAtraso) return;
        qtdAssEmAtraso += 1;
        const preco = a.preco_snapshot_centavos ?? a.planos?.preco_em_centavos ?? 0;
        const valor = vencidas ? vencidas.soma : preco;
        const dias = vencidas ? diasDesde(vencidas.maisAntiga.vencimento) : diasDesde(a.proximo_vencimento);
        totalInadimplente += valor;
        add(a.cliente_id, valor, dias, vencidas?.maisAntiga ?? null);
      });
      // faturas avulsas vencidas (sem assinatura)
      vencidasAvulsas.forEach((f) => {
        if (!f.clienteId) return;
        totalInadimplente += f.valorCentavos;
        add(f.clienteId, f.valorCentavos, diasDesde(f.vencimento), f);
      });

      setInadimplentes([...buckets.values()].sort((a, b) => b.totalCentavos - a.totalCentavos));
      setInadimplenciaCentavos(totalInadimplente);
      setAssinaturasEmAtraso(qtdAssEmAtraso);

      // ---- Avulsos pagos --------------------------------------------------------
      const pedRes = await supabase.from('pedidos').select('id, data_pedido').eq('status', 'pago');
      const pedidos = (pedRes.data ?? []) as Array<{ id: string; data_pedido: string | null }>;
      if (pedidos.length) {
        const dataPorPedido = new Map(pedidos.map((p) => [p.id, p.data_pedido]));
        const itensRes = await supabase
          .from('pedido_itens')
          .select('pedido_id, quantidade, preco_unit_centavos')
          .in('pedido_id', pedidos.map((p) => p.id));
        const itens = (itensRes.data ?? []) as Array<{ pedido_id: string; quantidade: number; preco_unit_centavos: number }>;
        setAvulsos(
          itens.map((i) => ({
            centavos: (Number(i.quantidade) || 1) * (i.preco_unit_centavos || 0),
            data: dataPorPedido.get(i.pedido_id) ?? null,
          })),
        );
      } else {
        setAvulsos([]);
      }
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados financeiros.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefetch(['pagamentos', 'assinaturas', 'pedidos', 'pedido_itens'], () => load(true));

  return {
    faturas,
    mrrCentavos,
    clientesAtivos,
    avulsos,
    inadimplentes,
    inadimplenciaCentavos,
    assinaturasEmAtraso,
    loading,
    error,
    refetch: () => load(true),
  };
};
