import { supabase } from '@/integrations/supabase/client';

/**
 * Registra uma atividade no log do cliente (`atividades_cliente`) via RPC `registrar_atividade`.
 * Usado para deixar rastreado o que o ADMIN fez na ficha do cliente (além do que o cliente faz
 * na plataforma). No-op se o cliente ainda não tem `user_id` provisionado. Nunca lança — falha
 * de log não deve quebrar a ação principal.
 */
export async function registrarAtividade(
  userId: string | null | undefined,
  acao: string,
  descricao: string,
): Promise<void> {
  if (!userId) return;
  try {
    await supabase.rpc('registrar_atividade', { p_user_id: userId, p_acao: acao, p_descricao: descricao });
  } catch (err) {
    console.warn('Falha ao registrar atividade:', err);
  }
}

/** Humaniza o código de ação (ex.: "assinatura_renovada" → "Assinatura renovada") para exibição. */
export const humanizarAcao = (acao: string): string => {
  const t = acao.replace(/[_-]+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Atividade';
};
