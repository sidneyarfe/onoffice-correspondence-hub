
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para gerar uma senha aleatória
function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Recebendo requisição para criar usuário a partir de contratação');
    
    const { contratacao_id } = await req.json();
    if (!contratacao_id) {
      throw new Error('contratacao_id é obrigatório');
    }

    console.log('Contratação ID recebido:', contratacao_id);

    // Use a service_role_key para operações de admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar dados da contratação
    console.log('Buscando dados da contratação...');
    const { data: contratacao, error: contratacaoError } = await supabaseAdmin
      .from('contratacoes_clientes')
      .select('email, nome_responsavel')
      .eq('id', contratacao_id)
      .single();

    if (contratacaoError) {
      console.error('Erro ao buscar contratação:', contratacaoError);
      throw new Error(`Contratação não encontrada: ${contratacaoError.message}`);
    }

    console.log('Dados da contratação encontrados:', contratacao);

    // 2. Gerar senha temporária
    const temporaryPassword = generateRandomPassword();
    console.log('Senha temporária gerada');

    // 3. Criar usuário no Supabase Auth
    console.log('Criando usuário no Supabase Auth...');
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: contratacao.email,
      password: temporaryPassword,
      email_confirm: true, // Marcar e-mail como confirmado
      user_metadata: { full_name: contratacao.nome_responsavel },
    });

    if (userError) {
      console.error('Erro ao criar usuário:', userError);
      throw new Error(`Erro ao criar usuário: ${userError.message}`);
    }
    
    const newUser = userData.user;
    console.log('Usuário criado com sucesso:', newUser.id);

    // Aguardar um momento para o trigger criar o perfil
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Atualizar o perfil com a senha em texto plano
    console.log('Atualizando perfil com senha temporária...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ temporary_password_plain: temporaryPassword })
      .eq('id', newUser.id);
      
    if (profileError) {
      console.error('Erro ao atualizar perfil:', profileError);
      throw new Error(`Erro ao atualizar perfil com senha: ${profileError.message}`);
    }

    // 5. Vincular o user_id à contratação
    console.log('Vinculando usuário à contratação...');
    const { error: linkError } = await supabaseAdmin
      .from('contratacoes_clientes')
      .update({ user_id: newUser.id })
      .eq('id', contratacao_id);

    if (linkError) {
      console.error('Erro ao vincular usuário:', linkError);
      throw new Error(`Erro ao vincular usuário à contratação: ${linkError.message}`);
    }

    console.log('Usuário criado e vinculado com sucesso!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        email: newUser.email, 
        temporary_password: temporaryPassword,
        user_id: newUser.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro na função create-user-from-contratacao:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
