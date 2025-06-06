
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

// Lógica Central de Decisão para escolher o template correto
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

  return templates[plano as keyof typeof templates]?.[tipoPessoa] || '';
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const contratacaoData: ContratacaoData = await req.json()
    
    console.log('Dados recebidos:', contratacaoData)

    // 1. Salvar dados iniciais no Supabase
    const { data: contratacao, error: dbError } = await supabaseClient
      .from('contratacoes_clientes')
      .insert({
        plano_selecionado: contratacaoData.plano_selecionado,
        tipo_pessoa: contratacaoData.tipo_pessoa,
        email: contratacaoData.email,
        telefone: contratacaoData.telefone,
        nome_responsavel: contratacaoData.nome_responsavel,
        cpf_responsavel: contratacaoData.cpf_responsavel,
        razao_social: contratacaoData.razao_social,
        cnpj: contratacaoData.cnpj,
        endereco: contratacaoData.endereco,
        numero_endereco: contratacaoData.numero_endereco,
        complemento_endereco: contratacaoData.complemento_endereco,
        bairro: contratacaoData.bairro,
        cidade: contratacaoData.cidade,
        estado: contratacaoData.estado,
        cep: contratacaoData.cep,
        status_contratacao: 'INICIADO'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Erro ao salvar no Supabase:', dbError)
      throw new Error(`Erro ao salvar dados: ${dbError.message}`)
    }

    console.log('Contratação salva no Supabase:', contratacao.id)

    // 2. Determinar template_id correto
    const templateId = getTemplateId(contratacaoData.plano_selecionado, contratacaoData.tipo_pessoa)
    
    if (!templateId) {
      throw new Error('Template não encontrado para esta combinação de plano e tipo de pessoa')
    }

    console.log('Template ID selecionado:', templateId)

    // 3. Preparar dados para ZapSign com endpoint e autenticação corretos
    const zapSignData = {
      template_id: templateId,
      signer_name: contratacaoData.nome_responsavel, // Nome do signatário
      signer_email: contratacaoData.email,          // Email do signatário
      send_automatic_email: true,
      sandbox: true, // Modo de teste. Remover ou mudar para 'false' em produção.
      data: [
        { "de": "{{NOME_RESPONSAVEL}}", "para": contratacaoData.nome_responsavel },
        { "de": "{{EMAIL_RESPONSAVEL}}", "para": contratacaoData.email },
        { "de": "{{TELEFONE_RESPONSAVEL}}", "para": contratacaoData.telefone },
        { "de": "{{CPF_RESPONSAVEL}}", "para": contratacaoData.cpf_responsavel },
        { "de": "{{ENDERECO_LOGRADOURO}}", "para": contratacaoData.endereco },
        { "de": "{{ENDERECO_NUMERO}}", "para": contratacaoData.numero_endereco },
        { "de": "{{ENDERECO_COMPLEMENTO}}", "para": contratacaoData.complemento_endereco || '' },
        { "de": "{{ENDERECO_BAIRRO}}", "para": contratacaoData.bairro || '' },
        { "de": "{{ENDERECO_CIDADE}}", "para": contratacaoData.cidade },
        { "de": "{{ENDERECO_ESTADO}}", "para": contratacaoData.estado },
        { "de": "{{ENDERECO_CEP}}", "para": contratacaoData.cep },
        { "de": "{{PLANO_NOME}}", "para": contratacaoData.plano_selecionado },
        // Adicionando dados da empresa apenas se for PJ
        ...(contratacaoData.tipo_pessoa === 'juridica' ? [
          { "de": "{{RAZAO_SOCIAL}}", "para": contratacaoData.razao_social || '' },
          { "de": "{{CNPJ}}", "para": contratacaoData.cnpj || '' }
        ] : [])
      ]
    }

    console.log('Dados para ZapSign (endpoint corrigido):', zapSignData)

    // 4. Chamar API do ZapSign com endpoint e autenticação corretos
    const zapSignApiKey = Deno.env.get('ZAPSIGN_API_KEY')
    if (!zapSignApiKey) {
      throw new Error('API Key do ZapSign não configurada')
    }

    const zapSignResponse = await fetch('https://api.zapsign.com.br/api/v1/documentos/criar-por-modelo/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-token': zapSignApiKey
      },
      body: JSON.stringify(zapSignData)
    })

    if (!zapSignResponse.ok) {
      const errorText = await zapSignResponse.text()
      console.error('Erro na API do ZapSign:', errorText)
      throw new Error(`Erro na API do ZapSign: ${zapSignResponse.status} - ${errorText}`)
    }

    const zapSignResult = await zapSignResponse.json()
    console.log('Resposta do ZapSign (endpoint corrigido):', zapSignResult)

    // 5. Atualizar Supabase com dados do ZapSign
    const { error: updateError } = await supabaseClient
      .from('contratacoes_clientes')
      .update({
        zapsign_document_token: zapSignResult.token || zapSignResult.token_documento,
        zapsign_template_id: templateId,
        status_contratacao: 'CONTRATO_ENVIADO'
      })
      .eq('id', contratacao.id)

    if (updateError) {
      console.error('Erro ao atualizar Supabase:', updateError)
      throw new Error(`Erro ao atualizar dados: ${updateError.message}`)
    }

    console.log('Processo concluído com sucesso com endpoint corrigido!')

    return new Response(
      JSON.stringify({
        success: true,
        contratacao_id: contratacao.id,
        message: 'Contrato enviado com sucesso! (Modo teste - sandbox)',
        sandbox: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro no processamento:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
