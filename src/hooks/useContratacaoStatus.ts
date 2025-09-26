
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// O hook agora só precisa do ID e do callback de sucesso
export function useContratacaoStatus(
  contratacaoId: string | null,
  onLinkReady: (link: string) => void
) {
  const query = useQuery({
    queryKey: ['contratacaoStatus', contratacaoId],
    queryFn: async () => {
       if (!contratacaoId) return null;
       const { data, error } = await supabase
         .from('contratacoes_clientes')
         .select('pagarme_payment_link')
         .eq('id', contratacaoId)
         .single();
       if (error && error.code !== 'PGRST116') throw error; // Ignora erro de "not found"
       return data;
    },
    refetchInterval: 3000,
    enabled: !!contratacaoId,
  });

  useEffect(() => {
    const paymentLink = query.data?.pagarme_payment_link;
    if (paymentLink) {
      onLinkReady(paymentLink);
    }
  }, [query.data, onLinkReady]);

  return query;
}
