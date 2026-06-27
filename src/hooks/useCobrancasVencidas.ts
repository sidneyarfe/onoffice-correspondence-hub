import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CobrancaVencida {
  id: string;
  clienteNome: string;
  email: string;
  valorReais: number;
  vencimento: string; // ISO date
  diasAtraso: number;
}

interface CobrancasVencidasData {
  items: CobrancaVencida[];
  totalReais: number;
  loading: boolean;
  refetch: () => void;
}

const STATUS_A_COBRAR = ['ATIVO', 'PAGAMENTO_PENDENTE'];

/**
 * Clientes vencidos / a cobrar: contratações ativas cujo `proximo_vencimento` já passou.
 * Derivação na leitura (Story 5.2/5.3). Quando a migração 5.2 estiver aplicada, o job diário
 * persiste o estado "vencida" no nível da fatura; este hook segue como a visão consolidada do
 * dashboard, ordenada por dias em atraso + valor.
 */
export const useCobrancasVencidas = (): CobrancasVencidasData => {
  const [items, setItems] = useState<CobrancaVencida[]>([]);
  const [totalReais, setTotalReais] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('contratacoes_clientes')
        .select('id, razao_social, nome_responsavel, email, proximo_vencimento, status_contratacao, preco')
        .lt('proximo_vencimento', hoje)
        .in('status_contratacao', STATUS_A_COBRAR)
        .order('proximo_vencimento', { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as Array<{
        id: string;
        razao_social: string | null;
        nome_responsavel: string | null;
        email: string | null;
        proximo_vencimento: string | null;
        preco: number | null;
      }>;

      const mapped: CobrancaVencida[] = rows
        .filter((r) => !!r.proximo_vencimento)
        .map((r) => {
          const venc = r.proximo_vencimento as string;
          const dias = Math.max(0, Math.floor((Date.now() - new Date(venc).getTime()) / 86400000));
          return {
            id: r.id,
            clienteNome: r.razao_social || r.nome_responsavel || 'Cliente',
            email: r.email || '',
            valorReais: (r.preco ?? 0) / 100,
            vencimento: venc,
            diasAtraso: dias,
          };
        })
        .sort((a, b) => b.diasAtraso - a.diasAtraso || b.valorReais - a.valorReais);

      setItems(mapped);
      setTotalReais(mapped.reduce((s, i) => s + i.valorReais, 0));
    } catch (err) {
      console.error('Erro ao carregar cobranças vencidas:', err);
      setItems([]);
      setTotalReais(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { items, totalReais, loading, refetch: load };
};
