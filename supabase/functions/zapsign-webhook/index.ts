import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { criarLinkPagamento } from '../_shared/infinitepay.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const REDIRECT_SUCESSO = 'https://clientes.onofficebelem.com.br/sucesso';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload = await req.json();
    // ZapSign envia o corpo do evento; external_id = cliente_plano_id (gravado na Story 3.4)
    const body = payload?.body ?? payload;
    const externalId = body?.external_id;
    const signedAt = body?.signers?.[0]?.signed_at ?? new Date().toISOString();
    if (!externalId) return json({ success: false, error: 'external_id ausente' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Assinatura + plano
    const { data: assinatura, error: assinErr } = await supabase
      .from('cliente_planos')
      .select('id, cliente_id, plano_id, status, preco_snapshot_centavos, planos:plano_id ( nome_plano )')
      .eq('id', externalId)
      .single();
    if (assinErr || !assinatura) {
      return json({ success: false, error: `Assinatura não encontrada: ${externalId}` }, 404);
    }

    // Idempotência: só processa se ainda aguardando assinatura
    if (assinatura.status !== 'aguardando_assinatura') {
      return json({ success: true, message: 'Já processado', status: assinatura.status });
    }

    // 1. Marca assinado → aguardando_pagamento
    const { error: updErr } = await supabase
      .from('cliente_planos')
      .update({ zapsign_signed_at: signedAt, status: 'aguardando_pagamento' })
      .eq('id', assinatura.id);
    if (updErr) throw new Error(`Erro ao atualizar assinatura: ${updErr.message}`);

    // Espelha na contratação (compat)
    await supabase
      .from('contratacoes_clientes')
      .update({ status_contratacao: 'CONTRATO_ASSINADO' })
      .eq('id', assinatura.cliente_id);

    // CRM (Epic 004 · Story 4.5): registra atividade no negócio ligado (best-effort)
    try {
      const { data: negocio } = await supabase
        .from('crm_negocios')
        .select('id')
        .eq('contratacao_id', assinatura.cliente_id)
        .limit(1)
        .maybeSingle();
      if (negocio?.id) {
        await supabase.from('crm_atividades').insert({
          negocio_id: negocio.id,
          tipo: 'nota',
          descricao: 'Contrato assinado ✍️ — aguardando pagamento.',
          concluida: true,
        });
      }
    } catch (e) {
      console.warn('CRM (zapsign) atividade falhou:', e);
    }

    // 2. Cria link InfinitePay (order_nsu = cliente_plano_id; pagamentos é criado no webhook pago)
    const nomePlano = (assinatura as Record<string, unknown>).planos as { nome_plano?: string } | null;
    const valorCentavos = assinatura.preco_snapshot_centavos ?? 0;
    if (!valorCentavos) {
      return json({ success: false, error: 'Assinatura sem preço (preco_snapshot_centavos)' }, 400);
    }
    const link = await criarLinkPagamento({
      items: [{ name: `Endereço Fiscal - ${nomePlano?.nome_plano ?? ''}`.trim(), price: valorCentavos, quantity: 1 }],
      orderNsu: assinatura.id,
      webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/infinitepay-webhook`,
      redirectUrl: REDIRECT_SUCESSO,
    });

    // 3. Persiste o link na assinatura
    const { error: persistErr } = await supabase
      .from('cliente_planos')
      .update({
        infinitepay_slug: link.slug,
        infinitepay_order_nsu: link.order_nsu,
        payment_link: link.payment_url,
      })
      .eq('id', assinatura.id);
    if (persistErr) throw new Error(`Erro ao salvar link na assinatura: ${persistErr.message}`);

    return json({ success: true, cliente_plano_id: assinatura.id, payment_link: link.payment_url });
  } catch (error) {
    console.error('Erro em zapsign-webhook:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
