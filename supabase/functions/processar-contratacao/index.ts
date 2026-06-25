import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZAPSIGN_CREATE_DOC = 'https://api.zapsign.com.br/api/v1/models/create-doc/';
const REDIRECT_BASE = 'https://clientes.onofficebelem.com.br/processando-pagamento';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

// Monta o array de variáveis do contrato (formato ZapSign {de, para}) — ver
// docs/architecture/n8n-sistema-on-reference.md (Fluxo 1).
function montarDataVars(c: Record<string, string | null | undefined>) {
  const dataVars = [
    { de: '{{NOME_RESPONSAVEL}}', para: c.nome_responsavel ?? '' },
    { de: '{{CPF_RESPONSAVEL}}', para: c.cpf_responsavel ?? '' },
    { de: '{{EMAIL_RESPONSAVEL}}', para: c.email ?? '' },
    { de: '{{TELEFONE_RESPONSAVEL}}', para: c.telefone ?? '' },
    { de: '{{ENDERECO_LOGRADOURO}}', para: c.endereco ?? '' },
    { de: '{{ENDERECO_NUMERO}}', para: c.numero_endereco ?? '' },
    { de: '{{ENDERECO_COMPLEMENTO}}', para: c.complemento_endereco ?? '' },
    { de: '{{ENDERECO_BAIRRO}}', para: c.bairro ?? '' },
    { de: '{{ENDERECO_CIDADE}}', para: c.cidade ?? '' },
    { de: '{{ENDERECO_ESTADO}}', para: c.estado ?? '' },
    { de: '{{ENDERECO_CEP}}', para: c.cep ?? '' },
    { de: '{{PLANO_NOME}}', para: c.plano_selecionado ?? '' },
  ];
  if (c.tipo_pessoa === 'juridica') {
    dataVars.push({ de: '{{RAZAO_SOCIAL}}', para: c.razao_social ?? '' });
    dataVars.push({ de: '{{CNPJ}}', para: c.cnpj ?? '' });
  }
  return dataVars;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      nome_responsavel, cpf_responsavel, email, telefone, tipo_pessoa,
      razao_social, cnpj, endereco, numero_endereco, complemento_endereco,
      bairro, cidade, estado, cep, plano_id,
    } = body ?? {};

    // 1. Validação de entrada
    const faltando = [
      ['email', email], ['nome_responsavel', nome_responsavel],
      ['tipo_pessoa', tipo_pessoa], ['plano_id', plano_id],
    ].filter(([, v]) => !v).map(([k]) => k);
    if (faltando.length) {
      return json({ success: false, error: `Campos obrigatórios ausentes: ${faltando.join(', ')}` }, 400);
    }
    if (tipo_pessoa !== 'fisica' && tipo_pessoa !== 'juridica') {
      return json({ success: false, error: "tipo_pessoa deve ser 'fisica' ou 'juridica'" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      (Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) ?? ''
    );
    const zapsignToken = Deno.env.get('ZAPSIGN_API_TOKEN');
    if (!zapsignToken) {
      return json({ success: false, error: 'ZAPSIGN_API_TOKEN não configurado' }, 500);
    }

    // 2. Plano + template ZapSign por tipo de pessoa
    const { data: plano, error: planoErr } = await supabase
      .from('planos')
      .select('id, nome_plano, periodicidade, preco_em_centavos, produto_id, zapsign_template_id_pf, zapsign_template_id_pj')
      .eq('id', plano_id)
      .single();
    if (planoErr || !plano) {
      return json({ success: false, error: `Plano não encontrado: ${planoErr?.message ?? plano_id}` }, 400);
    }
    const templateId = tipo_pessoa === 'juridica' ? plano.zapsign_template_id_pj : plano.zapsign_template_id_pf;
    if (!templateId) {
      return json({ success: false, error: `Plano ${plano.nome_plano} sem template ZapSign para ${tipo_pessoa}` }, 400);
    }

    // 3. Upsert da contratação (reusa por e-mail se já existir uma pessoa)
    const dadosPessoa = {
      nome_responsavel, cpf_responsavel, email, telefone, tipo_pessoa,
      razao_social: razao_social ?? null, cnpj: cnpj ?? null,
      endereco, numero_endereco, complemento_endereco: complemento_endereco ?? null,
      bairro: bairro ?? null, cidade, estado, cep,
      plano_id, plano_selecionado: plano.nome_plano, produto_id: plano.produto_id,
      preco: plano.preco_em_centavos, status_contratacao: 'CONTRATO_ENVIADO',
    };

    const { data: existente } = await supabase
      .from('contratacoes_clientes')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    let contratacaoId: string;
    if (existente?.id) {
      contratacaoId = existente.id;
      const { error: updErr } = await supabase
        .from('contratacoes_clientes').update(dadosPessoa).eq('id', contratacaoId);
      if (updErr) throw new Error(`Erro ao atualizar contratação: ${updErr.message}`);
    } else {
      const { data: nova, error: insErr } = await supabase
        .from('contratacoes_clientes').insert(dadosPessoa).select('id').single();
      if (insErr || !nova) throw new Error(`Erro ao criar contratação: ${insErr?.message}`);
      contratacaoId = nova.id;
    }

    // 4. Idempotência: assinatura pendente com contrato já gerado → retorna a existente
    const { data: assinaturaExistente } = await supabase
      .from('cliente_planos')
      .select('id, zapsign_signing_url')
      .eq('cliente_id', contratacaoId).eq('plano_id', plano_id)
      .eq('status', 'aguardando_assinatura')
      .not('zapsign_signing_url', 'is', null)
      .limit(1).maybeSingle();
    if (assinaturaExistente?.zapsign_signing_url) {
      return json({
        success: true, contratacao_id: contratacaoId,
        cliente_plano_id: assinaturaExistente.id,
        signing_url: assinaturaExistente.zapsign_signing_url, reused: true,
      });
    }

    // 5. Cria a assinatura pendente (proximo_vencimento preenchido pelo trigger)
    const hoje = new Date().toISOString().split('T')[0];
    const { data: assinatura, error: assinErr } = await supabase
      .from('cliente_planos')
      .insert({
        cliente_id: contratacaoId, plano_id, produto_id: plano.produto_id,
        data_inicio: hoje, status: 'aguardando_assinatura',
        preco_snapshot_centavos: plano.preco_em_centavos,
      })
      .select('id').single();
    if (assinErr || !assinatura) throw new Error(`Erro ao criar assinatura: ${assinErr?.message}`);
    const clientePlanoId = assinatura.id;

    // 6. Contrato ZapSign (external_id = assinatura, para casar no webhook)
    const zapResp = await fetch(ZAPSIGN_CREATE_DOC, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${zapsignToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId,
        external_id: clientePlanoId,
        signer_name: nome_responsavel,
        signer_email: email,
        send_automatic_email: true,
        redirect_link: `${REDIRECT_BASE}?id=${contratacaoId}`,
        sandbox: false,
        data: montarDataVars({ ...dadosPessoa }),
      }),
    });
    const zap = await zapResp.json();
    if (!zapResp.ok) {
      throw new Error(`ZapSign falhou (${zapResp.status}): ${JSON.stringify(zap)}`);
    }
    const signingUrl = zap?.signers?.[0]?.sign_url ?? null;

    // 7. Persiste o contrato na assinatura
    const { error: persistErr } = await supabase
      .from('cliente_planos')
      .update({
        zapsign_document_token: zap?.token ?? null,
        zapsign_signing_url: signingUrl,
        zapsign_template_id: templateId,
      })
      .eq('id', clientePlanoId);
    if (persistErr) throw new Error(`Erro ao salvar contrato na assinatura: ${persistErr.message}`);

    return json({
      success: true, contratacao_id: contratacaoId,
      cliente_plano_id: clientePlanoId, signing_url: signingUrl,
    });
  } catch (error) {
    console.error('Erro em processar-contratacao:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
