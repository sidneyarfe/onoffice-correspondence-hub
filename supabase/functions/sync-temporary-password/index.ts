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

    const { user_id, password } = await req.json();
    
    if (!user_id || !password) {
      throw new Error('user_id e password são obrigatórios');
    }

    console.log('Sincronizando senha temporária para usuário:', user_id);

    // Atualizar a senha no Supabase Auth usando Service Role
    const { data: updateData, error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user_id,
      { password: password }
    );

    if (updateError) {
      console.error('Erro ao atualizar senha no Auth:', updateError);
      throw new Error(`Erro ao atualizar senha: ${updateError.message}`);
    }

    console.log('Senha sincronizada com sucesso no Supabase Auth');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Senha temporária sincronizada com sucesso',
        user_id: user_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro na sincronização:', error.message);
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