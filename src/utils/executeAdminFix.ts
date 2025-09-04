import { fixOnOfficeAdmin } from './createAdminInAuth';

/**
 * Executa imediatamente a correção do admin onoffice1893@gmail.com
 * Esta função pode ser chamada diretamente no console ou por componentes
 */
export const executeAdminFix = async () => {
  console.log('🚀 Executando correção imediata do admin...');
  
  const result = await fixOnOfficeAdmin();
  
  console.log('📊 Resultado da correção:', result);
  
  if (result.success) {
    console.log('✅ ADMIN CORRIGIDO COM SUCESSO!');
    console.log('📧 Agora você pode usar a recuperação de senha em: /forgot-password');
    console.log('🔑 Email: onoffice1893@gmail.com');
    console.log('🔐 Senha: OnOffice2024!');
  } else {
    console.error('❌ FALHA NA CORREÇÃO:', result.error);
  }
  
  return result;
};

// Tornar a função disponível globalmente para debug
(window as any).executeAdminFix = executeAdminFix;