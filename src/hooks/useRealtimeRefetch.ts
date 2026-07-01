import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Assina mudanças (INSERT/UPDATE/DELETE) das tabelas-base via Supabase Realtime e chama `onChange`
 * (debounced) sempre que algo muda — para a UI atualizar sem recarregar a página.
 *
 * Requer que as tabelas estejam na publicação `supabase_realtime` (migração 20260627160000).
 * Use os nomes das TABELAS-BASE (ex.: 'clientes', 'assinaturas'), não views de compat.
 */
export function useRealtimeRefetch(tables: string[], onChange: () => void, enabled = true) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const key = tables.join(',');

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cbRef.current(), 400);
    };

    const channel = supabase.channel(`rt-${key}-${Math.random().toString(36).slice(2, 8)}`);
    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, debounced);
    });
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);
}
