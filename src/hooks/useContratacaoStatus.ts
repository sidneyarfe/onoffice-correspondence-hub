
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContratacaoStatus {
  signing_url: string | null;
  payment_link: string | null;
  status: string;
}

export const useContratacaoStatus = (contratacaoId: string | null) => {
  const [status, setStatus] = useState<ContratacaoStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!contratacaoId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Consultando status para ID:', contratacaoId);
      
      const { data, error: functionError } = await supabase.functions.invoke('get-contratacao-status', {
        body: { contratacao_id: contratacaoId }
      });

      if (functionError) {
        console.error('Erro na função:', functionError);
        throw new Error(functionError.message || 'Erro ao consultar status');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log('Status recebido:', data);
      setStatus(data);
      
    } catch (err) {
      console.error('Erro ao consultar status:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [contratacaoId]);

  useEffect(() => {
    if (!contratacaoId) return;

    // Verificar imediatamente
    checkStatus();

    // Configurar polling a cada 3 segundos
    const interval = setInterval(checkStatus, 3000);

    // Cleanup
    return () => clearInterval(interval);
  }, [checkStatus, contratacaoId]);

  return { status, loading, error, refetch: checkStatus };
};
