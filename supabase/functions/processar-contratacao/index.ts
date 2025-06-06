
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Headers de CORS para permitir que a aplicação web chame esta função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface para os dados recebidos do formulário da Lovable
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

// Função que mapeia a escolha do plano/tipo de pessoa para o ID do template correto
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

// Servidor da Edge Function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializa o cliente Supabase usando a chave de serviço para ter privilégios de admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Importante usar a SERVICE_ROLE_KEY
    );

    const contratacaoData: ContratacaoData = await req.json();
    console.log('Dados de contratação recebidos:', contratacaoData);

    // 1. Salvar dados iniciais na tabela do Supabase
    const { data: contratacao, error: dbError } = await supabaseClient
      .from('contratacoes_clientes')
      .insert({
        ...contratacaoData,
        status_contratacao: 'INICIADO'
      })
      .select()
      .single();

    if (dbError) throw new Error(`Erro ao salvar no Supabase: ${dbError.message}`);
    console.log('Registro de contratação salvo no Supabase com ID:', contratacao.id);

    // 2. Selecionar o ID do template correto
    const templateId = getTemplateId(contratacaoData.plano_selecionado, contratacaoData.tipo_pessoa);
    if (!templateId) {
      throw new Error('Combinação de plano e tipo de pessoa inválida. Não foi possível encontrar um template.');
    }
    console.log(`Template selecionado: ${templateId}`);

    // 3. Montar o payload para a API do ZapSign com a estrutura CORRIGIDA
    const zapSignPayload = {
      template_id: templateId,
      // Dados do signatário aninhados corretamente
      signer: {
        name: contratacaoData.nome_responsavel,
        email: contratacaoData.email,
        phone: contratacaoData.telefone,
      },
      external_id: contratacao.id, // ID do nosso DB para rastreamento via webhook
      send_automatic_email: true,
      sandbox: true, // Mudar para false em produção
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

    console.log("Enviando para ZapSign:", JSON.stringify(zapSignPayload, null, 2));

    // 4. Chamar a API do ZapSign com a autenticação CORRIGIDA
    const zapSignApiKey = Deno.env.get('ZAPSIGN_API_KEY');
    if (!zapSignApiKey) throw new Error('A variável de ambiente ZAPSIGN_API_KEY não está configurada no Supabase.');

    const zapSignResponse = await fetch('https://api.zapsign.com.br/api/v1/documentos/criar-por-modelo/', {
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
    console.log('Resultado do ZapSign:', zapSignResult);

    // 5. Atualizar o registro no Supabase com o token do documento
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

    console.log('Processo da Fase 1 concluído com sucesso.');

    // 6. Retornar sucesso para a Lovable
    return new Response(
      JSON.stringify({
        success: true,
        contratacao_id: contratacao.id,
        message: 'Contrato enviado para o seu email. Verifique sua caixa de entrada para assinar.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro geral na Edge Function:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
