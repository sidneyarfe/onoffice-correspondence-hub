
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContratacaoData {
  plano_selecionado: string;
  tipo_pessoa: 'fisica' | 'juridica';
  email: string;
  telefone: string;
  nome_responsavel: string;
  cpf_responsavel: string;
  razao_social?: string;
  cnpj?: string;
  endereco: string;
  numero_endereco: string;
  complemento_endereco?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  cep: string;
}

// *** FUNÇÃO ATUALIZADA COM OS NOVOS IDS DE CONTRATO ***
function getTemplateId(plano: string, tipoPessoa: 'fisica' | 'juridica'): string {
  const templates = {
    'MENSAL': {
      'juridica': 'b93bf9ad-f2ad-4df3-bb62-77497f8f88ff',
      'fisica': 'f6eb9976-f66f-47d7-8ddc-39666ea306f6'
    },
    '1 ANO': {
      'juridica': '64cda768-d413-48a2-84f9-e15df4590720',
      'fisica': 'ded30f07-d15e-44f1-83ac-2b40ec39dcf3'
    },
    '2 ANOS': {
      'juridica': '93388498-5ad5-4e4d-b2b2-f7c935de4856',
      'fisica': 'd331ff41-38cf-4bf8-9a59-ea8c535915b5'
    }
  };

  const planoKey = plano.toUpperCase().includes('MENSAL') ? 'MENSAL' :
                   plano.toUpperCase().includes('1 ANO') ? '1 ANO' :
                   plano.toUpperCase().includes('2 ANOS') ? '2 ANOS' : null;
  
  if (!planoKey) return '';

  return templates[planoKey as keyof typeof templates]?.[tipoPessoa] || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const contratacaoData: ContratacaoData = await req.json();

    const { data: contratacao, error: dbError } = await supabaseClient
      .from('contratacoes_clientes')
      .insert({ ...contratacaoData, status_contratacao: 'INICIADO' })
      .select()
      .single();

    if (dbError) throw new Error(`Erro ao salvar no Supabase: ${dbError.message}`);

    const templateId = getTemplateId(contratacaoData.plano_selecionado, contratacaoData.tipo_pessoa);
    if (!templateId) {
      throw new Error('Não foi possível encontrar um template para o plano e tipo de pessoa selecionados.');
    }
    console.log(`Template selecionado: ${templateId}`);

    const zapSignPayload = {
      signer: {
        name: contratacaoData.nome_responsavel,
        email: contratacaoData.email,
        phone: contratacaoData.telefone,
      },
      external_id: contratacao.id,
      send_automatic_email: true,
      sandbox: true,
      data: [
        { "de": "{{NOME_RESPONSAVEL}}", "para": contratacaoData.nome_responsavel },
        { "de": "{{CPF_RESPONSAVEL}}", "para": contratacaoData.cpf_responsavel },
        { "de": "{{EMAIL_RESPONSAVEL}}", "para": contratacaoData.email },
        { "de": "{{TELEFONE_RESPONSAVEL}}", "para": contratacaoData.telefone },
        { "de": "{{ENDERECO_LOGRADOURO}}", "para": contratacaoData.endereco },
        { "de": "{{ENDERECO_NUMERO}}", "para": contratacaoData.numero_endereco },
        { "de": "{{ENDERECO_COMPLEMENTO}}", "para": contratacaoData.complemento_endereco || '' },
        { "de": "{{ENDERECO_BAIRRO}}", "para": contratacaoData.bairro || '' },
        { "de": "{{ENDERECO_CIDADE}}", "para": contratacaoData.cidade },
        { "de": "{{ENDERECO_ESTADO}}", "para": contratacaoData.estado },
        { "de": "{{ENDERECO_CEP}}", "para": contratacaoData.cep },
        { "de": "{{PLANO_NOME}}", "para": contratacaoData.plano_selecionado },
        ...(contratacaoData.tipo_pessoa === 'juridica' ? [
          { "de": "{{RAZAO_SOCIAL}}", "para": contratacaoData.razao_social || '' },
          { "de": "{{CNPJ}}", "para": contratacaoData.cnpj || '' }
        ] : [])
      ]
    };

    const zapSignApiKey = Deno.env.get('ZAPSIGN_API_KEY');
    if (!zapSignApiKey) throw new Error('A variável de ambiente ZAPSIGN_API_KEY não está configurada no Supabase.');

    // *** CORREÇÃO PRINCIPAL: URL DINÂMICA E CORRETA ***
    const endpointUrl = `https://api.zapsign.com.br/api/v1/modelos/${templateId}/gerar-documento/`;

    const zapSignResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${zapSignApiKey}` // Autenticação CORRIGIDA
      },
      body: JSON.stringify(zapSignPayload),
    });

    const responseBodyText = await zapSignResponse.text();
    if (!zapSignResponse.ok) {
      console.error('Erro na resposta da API do ZapSign:', responseBodyText);
      throw new Error(`Erro na API do ZapSign: ${zapSignResponse.status} - ${responseBodyText}`);
    }

    const zapSignResult = JSON.parse(responseBodyText);

    const { error: updateError } = await supabaseClient
      .from('contratacoes_clientes')
      .update({
        zapsign_document_token: zapSignResult.token,
        zapsign_template_id: templateId,
        status_contratacao: 'CONTRATO_ENVIADO',
        updated_at: new Date().toISOString()
      })
      .eq('id', contratacao.id);

    if (updateError) throw new Error(`Erro ao atualizar Supabase com token do ZapSign: ${updateError.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        contratacao_id: contratacao.id,
        message: 'Contrato enviado para o seu email. Verifique sua caixa de entrada para assinar.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Erro geral na Edge Function:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
