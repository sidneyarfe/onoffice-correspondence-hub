import { supabase } from '@/integrations/supabase/client';

export const createMissingAuthUser = async (email: string, password: string, userId: string) => {
  console.log('=== EXECUTANDO CRIAÇÃO DE USUÁRIO NO SUPABASE AUTH ===');
  console.log('Email:', email);
  console.log('User ID:', userId);
  
  try {
    // Chamar edge function para criar usuário no Auth
    const { data, error } = await supabase.functions.invoke('create-missing-auth-user', {
      body: {
        email: email,
        password: password,
        user_id: userId
      }
    });

    console.log('Resposta da edge function:', { data, error });

    if (error) {
      throw new Error(`Erro na edge function: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Falha na criação do usuário');
    }

    console.log('✅ Usuário criado/atualizado com sucesso no Supabase Auth');
    
    // Testar login imediatamente
    console.log('🔍 Testando login após criação...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (loginError) {
      console.log('❌ Login ainda falha após criação:', loginError.message);
      return {
        success: false,
        userCreated: true,
        loginWorks: false,
        error: `Usuário criado, mas login falha: ${loginError.message}`
      };
    } else {
      console.log('✅ LOGIN FUNCIONANDO PERFEITAMENTE!');
      
      // Fazer logout imediatamente para não interferir
      await supabase.auth.signOut();
      
      return {
        success: true,
        userCreated: true,
        loginWorks: true,
        message: 'Usuário criado e login testado com sucesso!'
      };
    }

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return {
      success: false,
      userCreated: false,
      loginWorks: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

// Executar a correção para luiscfelipec@gmail.com
export const fixLuiscfelipecAccount = () => {
  return createMissingAuthUser(
    'luiscfelipec@gmail.com',
    'iIwG1cfDJSrD',
    'c5e9a3f2-b6a0-41bf-9f57-68ffc79ccdce'
  );
};