import { supabase } from '@/integrations/supabase/client';

export interface CreateAdminResult {
  success: boolean;
  message: string;
  userId?: string;
  error?: string;
}

/**
 * Força a criação de um usuário admin no sistema auth.users do Supabase
 * Esta é uma função direta que bypassa a sincronização automática
 */
export const createAdminInAuth = async (
  email: string, 
  password: string, 
  fullName: string
): Promise<CreateAdminResult> => {
  console.log('🔧 Iniciando criação direta do admin no auth.users:', email);
  
  try {
    // Chamar a edge function diretamente
    const { data, error } = await supabase.functions.invoke('create-admin-auth-user', {
      body: {
        email: email,
        password: password,
        full_name: fullName
      }
    });

    console.log('📝 Resposta da edge function:', { data, error });

    if (error) {
      console.error('❌ Erro na edge function:', error);
      return {
        success: false,
        message: 'Erro ao chamar função de criação',
        error: error.message
      };
    }

    if (!data || !data.success) {
      console.error('❌ Edge function não retornou sucesso:', data);
      return {
        success: false,
        message: data?.error || 'Falha na criação do usuário',
        error: data?.error
      };
    }

    console.log('✅ Admin criado com sucesso no auth.users:', data.user_id);
    
    // Testar login imediatamente para verificar se funcionou
    console.log('🧪 Testando login após criação...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (loginError) {
      console.warn('⚠️ Login falhou após criação:', loginError.message);
      return {
        success: true,
        message: 'Usuário criado, mas login ainda não funciona. Aguarde alguns minutos.',
        userId: data.user_id,
        error: `Login test failed: ${loginError.message}`
      };
    } else {
      console.log('✅ LOGIN FUNCIONANDO PERFEITAMENTE!');
      
      // Fazer logout imediatamente para não interferir
      await supabase.auth.signOut();
      
      return {
        success: true,
        message: 'Admin criado e testado com sucesso! Recuperação de senha agora funciona.',
        userId: data.user_id
      };
    }

  } catch (error) {
    console.error('🚨 Erro geral na criação do admin:', error);
    return {
      success: false,
      message: 'Erro interno na criação do usuário',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

/**
 * Corrige especificamente o admin onoffice1893@gmail.com
 */
export const fixOnOfficeAdmin = () => {
  return createAdminInAuth(
    'onoffice1893@gmail.com',
    'OnOffice2024!',
    'OnOffice Admin'
  );
};