
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

    // 3. Verificar se o usuário já existe
    console.log('Verificando se usuário já existe...');
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    // Buscar usuário específico por email
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const existingUserByEmail = userList?.users?.find(u => u.email === contratacao.email);
    
    if (existingUserByEmail) {
      console.log('Usuário já existe, gerando nova senha temporária...');
      
      // 4. Salvar nova senha temporária para o usuário existente
      console.log('Salvando nova senha temporária para usuário existente...');
      const { data: passwordResult, error: passwordError } = await supabaseAdmin
        .rpc('create_temporary_password_hash', {
          p_user_id: existingUserByEmail.id,
          p_password: temporaryPassword
        });
        
      if (passwordError) {
        console.error('Erro ao salvar senha temporária para usuário existente:', passwordError);
        throw new Error(`Erro ao salvar senha temporária: ${passwordError.message}`);
      }

      console.log('Nova senha temporária salva para usuário existente');
      
      // 5. Vincular o user_id à contratação
      console.log('Vinculando usuário existente à contratação...');
      const { error: linkError } = await supabaseAdmin
        .from('contratacoes_clientes')
        .update({ user_id: existingUserByEmail.id })
        .eq('id', contratacao_id);

      if (linkError) {
        console.error('Erro ao vincular usuário existente:', linkError);
        throw new Error(`Erro ao vincular usuário existente à contratação: ${linkError.message}`);
      }

      console.log('Usuário existente vinculado com sucesso!');
      return new Response(
        JSON.stringify({ 
          success: true, 
          email: existingUserByEmail.email, 
          temporary_password: temporaryPassword,
          user_id: existingUserByEmail.id,
          message: 'Usuário existente vinculado à contratação com nova senha temporária'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        }
      );
    }

    // 5. Criar usuário no Supabase Auth (somente se não existir)
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

    // 6. Salvar senha temporária usando função segura do banco
    console.log('Salvando senha temporária com hash...');
    const { data: passwordResult, error: passwordError } = await supabaseAdmin
      .rpc('create_temporary_password_hash', {
        p_user_id: newUser.id,
        p_password: temporaryPassword
      });
      
    if (passwordError) {
      console.error('Erro ao salvar senha temporária:', passwordError);
      throw new Error(`Erro ao salvar senha temporária: ${passwordError.message}`);
    }

    console.log('Senha temporária salva com sucesso');

    // 7. Vincular o user_id à contratação
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
