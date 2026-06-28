import { supabase } from '@/integrations/supabase/client';

export interface NotificacaoOpts {
  /** notificação interna na plataforma (sino do cliente) */
  interna: boolean;
  /** envio por e-mail (best-effort via edge function `enviar-notificacao`) */
  email: boolean;
}

/**
 * Notifica o cliente sobre uma cobrança/fatura. A interna é gravada em `notificacoes`
 * (policy de admin existe). O e-mail é best-effort: chama a edge function `enviar-notificacao`
 * — se ela não estiver deployada/configurada (RESEND), falha silenciosa e a interna persiste.
 * Nunca lança: falha de notificação não pode quebrar a ação financeira.
 */
export async function notificarCliente(
  userId: string | null | undefined,
  titulo: string,
  mensagem: string,
  opts: NotificacaoOpts,
): Promise<void> {
  if (!userId) return;

  if (opts.interna) {
    try {
      await supabase.from('notificacoes').insert({ user_id: userId, titulo, mensagem, tipo: 'cobranca' } as never);
    } catch (err) {
      console.warn('Falha ao criar notificação interna:', err);
    }
  }

  if (opts.email) {
    try {
      await supabase.functions.invoke('enviar-notificacao', { body: { user_id: userId, titulo, mensagem } });
    } catch (err) {
      console.warn('Falha ao enviar e-mail (edge function enviar-notificacao indisponível?):', err);
    }
  }
}
