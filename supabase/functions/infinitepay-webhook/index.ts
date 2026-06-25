import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload = await req.json();
    const body = payload?.body ?? payload;
    // order_nsu = cliente_plano_id (definido na Story 3.5)
    const orderNsu = body?.order_nsu ?? body?.data?.order_nsu;
    const slug = body?.invoice_slug ?? body?.slug ?? body?.data?.slug ?? null;
    // valor pago (centavos) — confirmar nome exato do campo no deploy
    const paidCentavos = body?.paid_amount ?? body?.amount ?? body?.data?.paid_amount ?? null;
    const metodo = body?.capture_method ?? body?.payment_method ?? body?.data?.payment_method ?? null;
    if (!orderNsu) return json({ success: false, error: 'order_nsu ausente' }, 400);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Assinatura + periodicidade do plano
    const { data: assinatura, error: assinErr } = await supabase
      .from('cliente_planos')
      .select('id, cliente_id, plano_id, status, preco_snapshot_centavos, infinitepay_order_nsu, planos:plano_id ( nome_plano, periodicidade )')
      .eq('id', orderNsu)
      .single();
    if (assinErr || !assinatura) {
      return json({ success: false, error: `Assinatura não encontrada para order_nsu ${orderNsu}` }, 404);
    }

    // Idempotência por status da assinatura
    if (assinatura.status === 'ativo') {
      return json({ success: true, message: 'Pagamento já conciliado', cliente_plano_id: assinatura.id });
    }

    const hoje = new Date().toISOString().split('T')[0];
    const plano = (assinatura as Record<string, unknown>).planos as { nome_plano?: string; periodicidade?: string } | null;

    // 1. Recalcula vencimento a partir de hoje (ativação)
    const { data: novoVenc } = await supabase.rpc('calcular_vencimento_por_periodicidade', {
      p_data_inicio: hoje,
      p_periodicidade: plano?.periodicidade ?? 'anual',
    });

    // 2. Ativa a assinatura
    const { error: updErr } = await supabase
      .from('cliente_planos')
      .update({
        status: 'ativo',
        paid_at: new Date().toISOString(),
        data_ultimo_pagamento: hoje,
        metodo_pagamento: metodo,
        proximo_vencimento: novoVenc ?? undefined,
        infinitepay_slug: slug ?? undefined,
      })
      .eq('id', assinatura.id);
    if (updErr) throw new Error(`Erro ao ativar assinatura: ${updErr.message}`);

    // 3. Provisiona o usuário (reusa create-user-from-contratacao; gatilho = assinatura paga)
    const provResp = await fetch(`${SUPABASE_URL}/functions/v1/create-user-from-contratacao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ contratacao_id: assinatura.cliente_id }),
    });
    const prov = await provResp.json();
    const userId: string | null = prov?.user_id ?? null;

    // 4. Registra o pagamento (granularidade por assinatura). user_id NOT NULL → exige provisionamento.
    if (userId) {
      const valorReais = paidCentavos != null ? Number(paidCentavos) / 100 : (assinatura.preco_snapshot_centavos ?? 0) / 100;
      await supabase.from('pagamentos').insert({
        cliente_plano_id: assinatura.id,
        contratacao_id: assinatura.cliente_id,
        user_id: userId,
        valor: valorReais,
        data_vencimento: hoje,
        data_pagamento: hoje,
        descricao: `Pagamento - ${plano?.nome_plano ?? 'Endereço Fiscal'}`,
        status: 'pago',
      });
    } else {
      console.warn('Provisionamento sem user_id; pagamento não registrado:', prov);
    }

    // 5. Espelha status da contratação
    await supabase
      .from('contratacoes_clientes')
      .update({ status_contratacao: 'ATIVO' })
      .eq('id', assinatura.cliente_id);

    // 5.5 CRM (Epic 004 · Story 4.5): move o negócio ligado para "Ganho" (tipo=ganho).
    //     Idempotente (só se ainda não ganho) e best-effort (não quebra o fluxo de pagamento).
    try {
      const { data: negocio } = await supabase
        .from('crm_negocios')
        .select('id, status')
        .eq('contratacao_id', assinatura.cliente_id)
        .limit(1)
        .maybeSingle();
      if (negocio?.id && negocio.status !== 'ganho') {
        const { data: etapaGanho } = await supabase
          .from('crm_etapas')
          .select('id')
          .eq('tipo', 'ganho')
          .eq('ativo', true)
          .order('ordem', { ascending: true })
          .limit(1)
          .maybeSingle();
        await supabase
          .from('crm_negocios')
          .update({ status: 'ganho', etapa_id: etapaGanho?.id ?? undefined })
          .eq('id', negocio.id);
        await supabase.from('crm_atividades').insert({
          negocio_id: negocio.id,
          tipo: 'nota',
          descricao: 'Pagamento confirmado 🎉 — negócio ganho.',
          concluida: true,
        });
      }
    } catch (e) {
      console.warn('CRM (infinitepay) progressão falhou:', e);
    }

    return json({
      success: true,
      cliente_plano_id: assinatura.id,
      user_provisioned: Boolean(userId),
      proximo_vencimento: novoVenc ?? null,
    });
  } catch (error) {
    console.error('Erro em infinitepay-webhook:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
