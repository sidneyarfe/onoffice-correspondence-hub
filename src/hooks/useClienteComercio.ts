import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeRefetch } from './useRealtimeRefetch';

export interface Fatura {
  id: string;
  valorCentavos: number;
  vencimento: string | null; // data de vencimento do pagamento (≠ fim do período)
  pagaEm: string | null;
  criadaEm: string | null; // data de emissão/registro da fatura (início do período)
  status: string; // aberta | paga | vencida | cancelada (derivado pela view)
  descricao: string | null;
}

export type SituacaoAssinatura = 'em_dia' | 'em_aberto' | 'vencido';

export interface AssinaturaItem {
  id: string;
  planoId: string | null;
  status: string;
  dataInicio: string | null;
  proximoVencimento: string | null;
  precoCentavos: number;
  planoNome: string;
  produtoNome: string;
  periodicidade: string | null;
  exigeContrato: boolean;
  faturas: Fatura[];
  situacao: SituacaoAssinatura;
}

export interface AvulsoItem {
  id: string;
  pedidoId: string;
  pedidoStatus: string;
  dataPedido: string;
  descricao: string;
  produtoNome: string;
  quantidade: number;
  unidade: string | null;
  precoUnitCentavos: number;
}

interface ClienteComercioData {
  assinaturas: AssinaturaItem[];
  avulsos: AvulsoItem[];
  loading: boolean;
  refetch: () => void;
}

/**
 * Carrega o que um cliente contratou: assinaturas (recorrentes, ex-`cliente_planos`) + avulsos
 * (`pedidos`/`pedido_itens`). Multi-produto por cliente (Story 5.4). Desacoplado do endereço fiscal.
 */
export const useClienteComercio = (clienteId?: string): ClienteComercioData => {
  const [assinaturas, setAssinaturas] = useState<AssinaturaItem[]>([]);
  const [avulsos, setAvulsos] = useState<AvulsoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clienteId) {
      setAssinaturas([]);
      setAvulsos([]);
      return;
    }
    setLoading(true);
    try {
      // Assinaturas (recorrentes) + nomes de plano/produto + faturas por assinatura
      const assRes = await supabase
        .from('assinaturas')
        .select(
          'id, status, proximo_vencimento, data_inicio, preco_snapshot_centavos, plano_id, produto_id, ' +
            'planos:plano_id ( nome_plano, periodicidade, preco_em_centavos ), produtos:produto_id ( nome_produto, exige_contrato )',
        )
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      const assRows = (assRes.data ?? []) as Array<{
        id: string;
        status: string;
        proximo_vencimento: string | null;
        data_inicio: string | null;
        preco_snapshot_centavos: number | null;
        plano_id: string | null;
        planos: { nome_plano?: string; periodicidade?: string | null; preco_em_centavos?: number } | null;
        produtos: { nome_produto?: string; exige_contrato?: boolean } | null;
      }>;

      // Faturas do cliente (view faturas) agrupadas por assinatura
      const fatRes = await supabase
        .from('faturas')
        .select('id, assinatura_id, valor_centavos, vencimento, paga_em, created_at, status, descricao')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });
      const fatRows = (fatRes.data ?? []) as Array<{
        id: string;
        assinatura_id: string | null;
        valor_centavos: number | null;
        vencimento: string | null;
        paga_em: string | null;
        created_at: string | null;
        status: string | null;
        descricao: string | null;
      }>;
      const faturasPorAss = new Map<string, Fatura[]>();
      fatRows.forEach((f) => {
        if (!f.assinatura_id) return;
        const arr = faturasPorAss.get(f.assinatura_id) ?? [];
        arr.push({
          id: f.id,
          valorCentavos: f.valor_centavos ?? 0,
          vencimento: f.vencimento,
          pagaEm: f.paga_em,
          criadaEm: f.created_at,
          status: f.status ?? 'aberta',
          descricao: f.descricao,
        });
        faturasPorAss.set(f.assinatura_id, arr);
      });

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const situacaoDe = (proximoVenc: string | null, faturas: Fatura[]): SituacaoAssinatura => {
        if (proximoVenc) {
          const v = new Date(proximoVenc).getTime();
          if (!Number.isNaN(v) && v < hoje.getTime()) return 'vencido';
        }
        if (faturas.some((f) => f.status === 'aberta' || f.status === 'vencida')) return 'em_aberto';
        return 'em_dia';
      };

      setAssinaturas(
        assRows.map((a) => {
          const faturas = faturasPorAss.get(a.id) ?? [];
          return {
            id: a.id,
            planoId: a.plano_id,
            status: a.status,
            dataInicio: a.data_inicio,
            proximoVencimento: a.proximo_vencimento,
            precoCentavos: a.preco_snapshot_centavos ?? a.planos?.preco_em_centavos ?? 0,
            planoNome: a.planos?.nome_plano ?? 'Plano',
            produtoNome: a.produtos?.nome_produto ?? '',
            periodicidade: a.planos?.periodicidade ?? null,
            exigeContrato: a.produtos?.exige_contrato ?? false,
            faturas,
            situacao: situacaoDe(a.proximo_vencimento, faturas),
          };
        }),
      );

      // Avulsos: pedidos do cliente → itens
      const pedRes = await supabase
        .from('pedidos')
        .select('id, status, data_pedido')
        .eq('cliente_id', clienteId)
        .order('data_pedido', { ascending: false });

      const pedidos = (pedRes.data ?? []) as Array<{ id: string; status: string; data_pedido: string }>;
      const pedidoIds = pedidos.map((p) => p.id);

      if (pedidoIds.length) {
        const itensRes = await supabase
          .from('pedido_itens')
          .select('id, pedido_id, descricao, quantidade, unidade, preco_unit_centavos, produtos:produto_id ( nome_produto )')
          .in('pedido_id', pedidoIds);

        const itens = (itensRes.data ?? []) as Array<{
          id: string;
          pedido_id: string;
          descricao: string | null;
          quantidade: number;
          unidade: string | null;
          preco_unit_centavos: number;
          produtos: { nome_produto?: string } | null;
        }>;
        const pedidoById = new Map(pedidos.map((p) => [p.id, p]));

        setAvulsos(
          itens.map((i) => {
            const ped = pedidoById.get(i.pedido_id);
            return {
              id: i.id,
              pedidoId: i.pedido_id,
              pedidoStatus: ped?.status ?? 'aberto',
              dataPedido: ped?.data_pedido ?? '',
              descricao: i.descricao ?? '',
              produtoNome: i.produtos?.nome_produto ?? '',
              quantidade: Number(i.quantidade) || 1,
              unidade: i.unidade,
              precoUnitCentavos: i.preco_unit_centavos,
            };
          }),
        );
      } else {
        setAvulsos([]);
      }
    } catch (err) {
      console.error('Erro ao carregar comércio do cliente:', err);
      setAssinaturas([]);
      setAvulsos([]);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  const atualizarStatusAssinatura = useCallback(
    async (assinaturaId: string, status: 'ativo' | 'suspenso' | 'cancelado') => {
      const { error } = await supabase
        .from('assinaturas')
        .update({ status, updated_at: new Date().toISOString() } as never)
        .eq('id', assinaturaId);
      if (error) throw error;
      await load();
    },
    [load],
  );

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefetch(['assinaturas', 'pedidos', 'pedido_itens', 'pagamentos'], load, !!clienteId);

  return { assinaturas, avulsos, loading, refetch: load, atualizarStatusAssinatura };
};
