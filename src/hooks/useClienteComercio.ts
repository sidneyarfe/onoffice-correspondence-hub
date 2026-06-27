import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeRefetch } from './useRealtimeRefetch';

export interface AssinaturaItem {
  id: string;
  status: string;
  proximoVencimento: string | null;
  precoCentavos: number;
  planoNome: string;
  produtoNome: string;
  periodicidade: string | null;
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
      // Assinaturas (recorrentes) + nomes de plano/produto
      const assRes = await supabase
        .from('assinaturas')
        .select(
          'id, status, proximo_vencimento, preco_snapshot_centavos, plano_id, produto_id, ' +
            'planos:plano_id ( nome_plano, periodicidade, preco_em_centavos ), produtos:produto_id ( nome_produto )',
        )
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      const assRows = (assRes.data ?? []) as Array<{
        id: string;
        status: string;
        proximo_vencimento: string | null;
        preco_snapshot_centavos: number | null;
        planos: { nome_plano?: string; periodicidade?: string | null; preco_em_centavos?: number } | null;
        produtos: { nome_produto?: string } | null;
      }>;

      setAssinaturas(
        assRows.map((a) => ({
          id: a.id,
          status: a.status,
          proximoVencimento: a.proximo_vencimento,
          precoCentavos: a.preco_snapshot_centavos ?? a.planos?.preco_em_centavos ?? 0,
          planoNome: a.planos?.nome_plano ?? 'Plano',
          produtoNome: a.produtos?.nome_produto ?? '',
          periodicidade: a.planos?.periodicidade ?? null,
        })),
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

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefetch(['assinaturas', 'pedidos', 'pedido_itens'], load, !!clienteId);

  return { assinaturas, avulsos, loading, refetch: load };
};
