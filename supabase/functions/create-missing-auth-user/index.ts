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

    const { email, password, user_id } = await req.json();
    
    if (!email || !password || !user_id) {
      throw new Error('email, password e user_id são obrigatórios');
    }

    console.log('Criando usuário no Supabase Auth:', email, 'com ID:', user_id);

    // Primeiro, verificar se o usuário já existe no Auth
    const { data: existingUser } = await supabaseClient.auth.admin.getUserById(user_id);
    
    if (existingUser.user) {
      console.log('Usuário já existe no Auth, apenas atualizando senha');
      
      // Se já existe, apenas atualizar a senha
      const { data: updateData, error: updateError } = await supabaseClient.auth.admin.updateUserById(
        user_id,
        { password: password }
      );

      if (updateError) {
        throw new Error(`Erro ao atualizar senha: ${updateError.message}`);
      }

      console.log('Senha atualizada com sucesso');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Senha atualizada com sucesso',
          user_id: user_id,
          action: 'updated'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não existe, criar novo usuário com o ID específico
    console.log('Criando novo usuário no Supabase Auth');
    
    const { data: createData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        created_by: 'admin',
        temporary_password: true
      }
    });

    if (createError) {
      console.error('Erro ao criar usuário no Auth:', createError);
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    if (!createData.user) {
      throw new Error('Usuário não foi criado corretamente');
    }

    console.log('Usuário criado com sucesso no Supabase Auth:', createData.user.id);

    // Atualizar o ID do usuário no profiles se necessário
    if (createData.user.id !== user_id) {
      console.log('Atualizando ID do usuário no profiles:', createData.user.id);
      
      const { error: updateProfileError } = await supabaseClient
        .from('profiles')
        .update({ id: createData.user.id })
        .eq('id', user_id);
      
      if (updateProfileError) {
        console.error('Erro ao atualizar profiles:', updateProfileError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário criado com sucesso no Supabase Auth',
        user_id: createData.user.id,
        original_user_id: user_id,
        action: 'created'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao processar usuário:', error.message);
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