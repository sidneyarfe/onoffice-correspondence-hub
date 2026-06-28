import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeRefetch } from './useRealtimeRefetch';

export interface FichaPagamento {
  id: string;
  valor: number; // reais
  status: string;
  descricao: string;
  data_vencimento: string;
  data_pagamento: string | null;
}
export interface FichaCorrespondencia {
  id: string;
  assunto: string;
  categoria: string;
  remetente: string;
  data_recebimento: string;
  visualizada: boolean;
}
export interface FichaDocumento {
  id: string;
  nome_documento: string;
  tipo: string;
  arquivo_url: string | null;
  descricao: string | null;
  data: string;
}
export interface FichaAtividade {
  id: string;
  acao: string;
  descricao: string;
  data_atividade: string;
}

export interface ClienteFichaData {
  pagamentos: FichaPagamento[];
  correspondencias: FichaCorrespondencia[];
  documentos: FichaDocumento[];
  atividades: FichaAtividade[];
  loading: boolean;
}

const EMPTY: ClienteFichaData = {
  pagamentos: [],
  correspondencias: [],
  documentos: [],
  atividades: [],
  loading: false,
};

/**
 * Carrega os dados das abas da ficha do cliente (Plano & Financeiro, Correspondências,
 * Documentos, Atividades) a partir das tabelas reais. Dados user-scoped só carregam
 * quando o cliente já tem `user_id` provisionado.
 */
export const useClienteFicha = (contratacaoId?: string, userId?: string | null): ClienteFichaData => {
  const [data, setData] = useState<ClienteFichaData>(EMPTY);
  const [tick, setTick] = useState(0);

  // Realtime: recarrega as abas quando pagamentos/correspondências/documentos/atividades mudam
  useRealtimeRefetch(
    ['pagamentos', 'correspondencias', 'documentos_cliente', 'atividades_cliente'],
    () => setTick((t) => t + 1),
    !!contratacaoId,
  );

  useEffect(() => {
    if (!contratacaoId) {
      setData(EMPTY);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setData((d) => ({ ...d, loading: true }));
      try {
        const [pagRes, corrRes, docRes, atvRes] = await Promise.all([
          supabase
            .from('pagamentos')
            .select('id, valor, status, descricao, data_vencimento, data_pagamento')
            .eq('contratacao_id', contratacaoId)
            .order('data_vencimento', { ascending: false }),
          userId
            ? supabase
                .from('correspondencias')
                .select('id, assunto, categoria, remetente, data_recebimento, visualizada')
                .eq('user_id', userId)
                .order('data_recebimento', { ascending: false })
                .limit(20)
            : Promise.resolve({ data: [] as unknown[] }),
          userId
            ? supabase
                .from('documentos_cliente')
                .select('id, nome_documento, tipo, arquivo_url, descricao, data_emissao, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50)
            : Promise.resolve({ data: [] as unknown[] }),
          userId
            ? supabase
                .from('atividades_cliente')
                .select('id, acao, descricao, data_atividade')
                .eq('user_id', userId)
                .order('data_atividade', { ascending: false })
                .limit(20)
            : Promise.resolve({ data: [] as unknown[] }),
        ]);

        if (cancelled) return;

        const pagRows = (pagRes.data ?? []) as Array<{
          id: string;
          valor: number | string;
          status: string;
          descricao: string;
          data_vencimento: string;
          data_pagamento: string | null;
        }>;
        const corrRows = (corrRes.data ?? []) as Array<{
          id: string;
          assunto: string;
          categoria: string;
          remetente: string;
          data_recebimento: string;
          visualizada: boolean;
        }>;
        const docRows = (docRes.data ?? []) as Array<{
          id: string;
          nome_documento: string;
          tipo: string;
          arquivo_url: string | null;
          descricao: string | null;
          data_emissao: string | null;
          created_at: string;
        }>;
        const atvRows = (atvRes.data ?? []) as Array<{
          id: string;
          acao: string;
          descricao: string;
          data_atividade: string;
        }>;

        setData({
          loading: false,
          pagamentos: pagRows.map((p) => ({
            id: p.id,
            valor: Number(p.valor) || 0,
            status: p.status,
            descricao: p.descricao,
            data_vencimento: p.data_vencimento,
            data_pagamento: p.data_pagamento,
          })),
          correspondencias: corrRows.map((m) => ({
            id: m.id,
            assunto: m.assunto,
            categoria: m.categoria,
            remetente: m.remetente,
            data_recebimento: m.data_recebimento,
            visualizada: !!m.visualizada,
          })),
          documentos: docRows.map((d) => ({
            id: d.id,
            nome_documento: d.nome_documento,
            tipo: d.tipo,
            arquivo_url: d.arquivo_url,
            descricao: d.descricao,
            data: d.data_emissao || d.created_at,
          })),
          atividades: atvRows.map((a) => ({
            id: a.id,
            acao: a.acao,
            descricao: a.descricao,
            data_atividade: a.data_atividade,
          })),
        });
      } catch (err) {
        console.error('Erro ao carregar ficha do cliente:', err);
        if (!cancelled) setData({ ...EMPTY, loading: false });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [contratacaoId, userId, tick]);

  return data;
};
