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
    const { submission_id } = await req.json();
    console.log('Processing submission:', submission_id);

    // Get submission data
    const { data: submission, error: submissionError } = await supabase
      .from('signup_submissions')
      .select('*')
      .eq('id', submission_id)
      .single();

    if (submissionError) {
      console.error('Erro ao buscar submission:', submissionError);
      throw new Error('Submission não encontrada');
    }

    // Send to N8n webhook
    const n8nWebhookUrl = 'https://onoffice-belem.app.n8n.cloud/webhook/processo-contratacao';
    
    const webhookData = {
      id: submission.id,
      email: submission.email,
      telefone: submission.telefone,
      nome_responsavel: submission.nome_responsavel,
      cpf_responsavel: submission.cpf_responsavel,
      plano_selecionado: submission.plano_selecionado,
      tipo_pessoa: submission.tipo_pessoa,
      razao_social: submission.razao_social,
      cnpj: submission.cnpj,
      endereco: submission.endereco,
      numero_endereco: submission.numero_endereco,
      complemento_endereco: submission.complemento_endereco,
      bairro: submission.bairro,
      cidade: submission.cidade,
      estado: submission.estado,
      cep: submission.cep,
      created_at: submission.created_at
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