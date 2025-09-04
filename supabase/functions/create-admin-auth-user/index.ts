import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Usar Service Role Key para acesso completo
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { email, password, full_name } = await req.json();
    
    if (!email || !password || !full_name) {
      throw new Error('email, password e full_name são obrigatórios');
    }

    console.log('Criando usuário admin no auth.users:', email);

    // Verificar se usuário já existe no auth.users
    const { data: existingUser } = await supabaseClient.auth.admin.getUserByEmail(email);
    
    if (existingUser?.user) {
      console.log('Usuário já existe no auth.users, atualizando senha...');
      
      // Atualizar senha do usuário existente
      const { data: updateData, error: updateError } = await supabaseClient.auth.admin.updateUserById(
        existingUser.user.id,
        { 
          password: password,
          email_confirmed_at: new Date().toISOString()
        }
      );

      if (updateError) {
        console.error('Erro ao atualizar usuário:', updateError);
        throw new Error(`Erro ao atualizar usuário: ${updateError.message}`);
      }

      console.log('Usuário atualizado com sucesso no auth.users');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Usuário admin atualizado com sucesso no auth.users',
          user_id: existingUser.user.id,
          action: 'updated'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        }
      );
    }

    // Criar novo usuário no auth.users
    const { data: createData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirmed_at: new Date().toISOString(), // Auto-confirmar email
      user_metadata: {
        full_name: full_name,
        role: 'admin'  
      }
    });

    if (createError) {
      console.error('Erro ao criar usuário no auth.users:', createError);
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    console.log('Usuário admin criado com sucesso no auth.users:', createData.user?.id);

    // Atualizar ou criar perfil na tabela profiles
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: createData.user!.id,
        email: email,
        full_name: full_name,
        role: 'admin'
      });

    if (profileError) {
      console.warn('Erro ao criar/atualizar perfil:', profileError);
      // Não falhar por causa do perfil, apenas logar o warning
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário admin criado com sucesso no auth.users',
        user_id: createData.user!.id,
        action: 'created'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro na criação do usuário admin:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});