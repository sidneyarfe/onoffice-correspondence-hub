import { supabase } from '@/integrations/supabase/client';

export const syncAdminToAuth = async (email: string, password: string, fullName: string) => {
  console.log('=== SINCRONIZANDO ADMIN NO SUPABASE AUTH ===');
  console.log('Email:', email);
  console.log('Nome:', fullName);
  
  try {
    // Chamar edge function para criar/atualizar usuário no Auth
    const { data, error } = await supabase.functions.invoke('create-admin-auth-user', {
      body: {
        email: email,
        password: password,
        full_name: fullName
      }
    });

    console.log('Resposta da edge function:', { data, error });

    if (error) {
      throw new Error(`Erro na edge function: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Falha na sincronização do admin');
    }

    console.log('✅ Admin sincronizado com sucesso no Supabase Auth');
    
    // Testar login imediatamente
    console.log('🔍 Testando login após sincronização...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (loginError) {
      console.log('❌ Login ainda falha após sincronização:', loginError.message);
      return {
        success: false,
        userSynced: true,
        loginWorks: false,
        error: `Admin sincronizado, mas login falha: ${loginError.message}`
      };
    } else {
      console.log('✅ LOGIN FUNCIONANDO PERFEITAMENTE!');
      
      // Fazer logout imediatamente para não interferir
      await supabase.auth.signOut();
      
      return {
        success: true,
        userSynced: true,
        loginWorks: true,
        message: 'Admin sincronizado e login testado com sucesso!'
      };
    }

  } catch (error) {
    console.error('Erro ao sincronizar admin:', error);
    return {
      success: false,
      userSynced: false,
      loginWorks: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

// Executar a sincronização para Gabriel Bogea
export const syncGabrielBogea = () => {
  return syncAdminToAuth(
    'gabrielbogea2@hotmail.com',
    '%K$#JOkOwVTT',
    'Gabriel Bogea'
  );
};