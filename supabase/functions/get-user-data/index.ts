
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

    const { user_id } = await req.json();
    
    if (!user_id) {
      throw new Error('user_id é obrigatório');
    }

    console.log('Consultando dados do usuário:', user_id);

    // Usar a função SQL para obter dados completos
    const { data, error } = await supabaseClient
      .rpc('get_user_contratacao_data', { p_user_id: user_id });

    if (error) {
      console.error('Erro ao consultar dados:', error);
      throw new Error(`Erro ao consultar dados: ${error.message}`);
    }

    if (!data) {
      throw new Error('Usuário não encontrado');
    }

    console.log('Dados encontrados para o usuário:', user_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro na consulta:', error.message);
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
