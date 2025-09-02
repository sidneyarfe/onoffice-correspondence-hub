import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contratacao_id } = await req.json();
    console.log('Processing contratacao:', contratacao_id);

    // Get contratacao data directly from contratacoes_clientes
    const { data: contratacao, error: contratacaoError } = await supabase
      .from('contratacoes_clientes')
      .select('*')
      .eq('id', contratacao_id)
      .single();

    if (contratacaoError) {
      console.error('Erro ao buscar contratação:', contratacaoError);
      throw new Error('Contratação não encontrada');
    }

    // Send to N8n webhook - correct URL from user's flow
    const n8nWebhookUrl = 'https://sidneyarfe.app.n8n.cloud/webhook-test/27403522-4155-4a85-a2fa-607ff38b8ea4';
    
    const webhookData = {
      id: contratacao.id,
      email: contratacao.email,
      telefone: contratacao.telefone,
      nome_responsavel: contratacao.nome_responsavel,
      cpf_responsavel: contratacao.cpf_responsavel,
      plano_selecionado: contratacao.plano_selecionado,
      tipo_pessoa: contratacao.tipo_pessoa,
      razao_social: contratacao.razao_social,
      cnpj: contratacao.cnpj,
      endereco: contratacao.endereco,
      numero_endereco: contratacao.numero_endereco,
      complemento_endereco: contratacao.complemento_endereco,
      bairro: contratacao.bairro,
      cidade: contratacao.cidade,
      estado: contratacao.estado,
      cep: contratacao.cep,
      status_contratacao: contratacao.status_contratacao,
      created_at: contratacao.created_at
    };

    console.log('Sending to N8n:', webhookData);

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    if (!n8nResponse.ok) {
      console.error('N8n webhook failed:', n8nResponse.status, await n8nResponse.text());
      throw new Error('Falha ao enviar para N8n');
    }

    console.log('N8n webhook enviado com sucesso');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Contratação processada e enviada para N8n' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no processamento:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});