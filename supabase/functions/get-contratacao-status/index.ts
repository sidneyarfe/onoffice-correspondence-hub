
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contratacao_id } = await req.json();

    if (!contratacao_id) {
      return new Response(
        JSON.stringify({ error: 'ID de contratação é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Consultando status para contratação ID:', contratacao_id);

    // Query the database for the contract status
    const { data, error } = await supabase
      .from('contratacoes_clientes')
      .select('zapsign_signing_url, asaas_payment_link, status_contratacao')
      .eq('id', contratacao_id)
      .single();

    if (error) {
      console.error('Erro ao consultar contratação:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar status da contratação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Contratação não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Status encontrado:', data);

    return new Response(
      JSON.stringify({
        signing_url: data.zapsign_signing_url,
        payment_link: data.asaas_payment_link,
        status: data.status_contratacao
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
