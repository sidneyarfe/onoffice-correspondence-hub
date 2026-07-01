import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeRefetch } from './useRealtimeRefetch';

// ============================================================================
// Últimas correspondências (admin) — lista enxuta das N mais recentes para a
// dashboard, já com o nome do cliente resolvido em UMA query batched (evita o
// N+1 do useAdminCorrespondences, que faz um SELECT por linha). Realtime ao vivo.
// ============================================================================

export interface RecentCorrespondence {
  id: string;
  assunto: string;
  remetente: string;
  categoria: string;
  data_recebimento: string;
  visualizada: boolean;
  arquivo_url: string | null;
  clienteNome: string;
}

export const useRecentCorrespondences = (limit = 6) => {
  const [items, setItems] = useState<RecentCorrespondence[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const { data, error } = await supabase
          .from('correspondencias')
          .select('id, assunto, remetente, categoria, data_recebimento, visualizada, arquivo_url, user_id, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) throw error;

        const rows = (data ?? []) as Array<{
          id: string;
          assunto: string;
          remetente: string;
          categoria: string;
          data_recebimento: string;
          visualizada: boolean;
          arquivo_url: string | null;
          user_id: string | null;
        }>;

        const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
        const nameByUser = new Map<string, string>();
        if (userIds.length) {
          const { data: cli } = await supabase
            .from('contratacoes_clientes')
            .select('user_id, razao_social, nome_responsavel')
            .in('user_id', userIds);
          (cli ?? []).forEach((c: { user_id: string; razao_social: string | null; nome_responsavel: string | null }) => {
            nameByUser.set(c.user_id, c.razao_social || c.nome_responsavel || 'Cliente');
          });
        }

        setItems(
          rows.map((r) => ({
            id: r.id,
            assunto: r.assunto,
            remetente: r.remetente,
            categoria: r.categoria,
            data_recebimento: r.data_recebimento,
            visualizada: !!r.visualizada,
            arquivo_url: r.arquivo_url ?? null,
            clienteNome: (r.user_id && nameByUser.get(r.user_id)) || 'Cliente não identificado',
          })),
        );
      } catch (err) {
        console.error('Erro ao carregar correspondências recentes:', err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefetch(['correspondencias'], () => load(true));

  return { items, loading, refetch: () => load(true) };
};
