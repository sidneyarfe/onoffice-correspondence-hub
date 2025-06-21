
import { supabase } from '@/integrations/supabase/client';

export const cleanupAuthState = () => {
  console.log('Limpando estado de autenticação...');
  
  // Limpar localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('Removendo chave do localStorage:', key);
      localStorage.removeItem(key);
    }
  });
  
  // Limpar sessionStorage se existir
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        console.log('Removendo chave do sessionStorage:', key);
        sessionStorage.removeItem(key);
      }
    });
  }
  
  // Limpar outras chaves relacionadas
  localStorage.removeItem('supabase.auth.token');
  localStorage.removeItem('onofficeContratacaoId');
  localStorage.removeItem('contratacaoTempId');
  
  console.log('Limpeza de estado concluída');
};

export const forceSignOut = async () => {
  console.log('Executando logout forçado...');
  
  try {
    // Tentar logout global
    await supabase.auth.signOut({ scope: 'global' });
    console.log('Logout global executado');
  } catch (error) {
    console.warn('Erro no logout global, continuando...', error);
  }
  
  // Limpar estado independentemente do resultado do logout
  cleanupAuthState();
  
  console.log('Logout forçado concluído');
};

// Versão simplificada do login limpo - sem forceSignOut desnecessário
export const performCleanLogin = async (email: string, password: string) => {
  console.log('Iniciando login para:', email);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Erro no login:', error);
      throw error;
    }
    
    console.log('Login executado com sucesso');
    return { data, error };
  } catch (error) {
    console.error('Erro no performCleanLogin:', error);
    throw error;
  }
};
