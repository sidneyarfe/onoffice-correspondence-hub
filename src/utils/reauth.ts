import { supabase } from '@/integrations/supabase/client';

/**
 * Re-autentica o ADMIN logado com a própria senha — gate para ações sensíveis
 * (renovar/suspender/cancelar assinatura). Não desloga nem troca de usuário:
 * `signInWithPassword` apenas revalida a credencial do mesmo e-mail da sessão.
 *
 * Lança Error com mensagem amigável em pt-BR se a sessão sumiu ou a senha está errada.
 */
export async function reauthAdmin(password: string): Promise<void> {
  const senha = password.trim();
  if (!senha) throw new Error('Informe a sua senha para confirmar.');

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.email) {
    throw new Error('Sessão não encontrada. Faça login novamente.');
  }

  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: senha });
  if (error) {
    throw new Error('Senha incorreta.');
  }
}
