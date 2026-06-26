// Epic 004 · Story 4.1 — Captura pública de lead (Google Ads / Meta Ads / site).
// Endpoint público (verify_jwt=false) chamado pelo formulário da landing page. Usa service role
// (ignora RLS — as tabelas crm_* são admin-only) + rate-limit (RPC check_rate_limit) + honeypot.
// Persiste o lead ANTES de o site abrir o WhatsApp, fechando o vazamento de leads (Story 4.1).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ORIGENS_VALIDAS = ['google_ads', 'meta_ads', 'site', 'manual', 'indicacao', 'outro'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? '0.0.0.0';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'Método não permitido' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const {
      nome, email, telefone, origem,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      titulo, observacoes, website, // website = honeypot
    } = body ?? {};

    // 1. Honeypot anti-bot — responde 200 silencioso (não revela o mecanismo)
    if (website) return json({ success: true, ignored: true });

    // 2. Validação mínima
    if (!nome || (!email && !telefone)) {
      return json({ success: false, error: 'Informe ao menos nome e e-mail ou telefone' }, 400);
    }
    const origemFinal = ORIGENS_VALIDAS.includes(origem) ? origem : 'site';
    const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : null;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY = (Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) ?? '';
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 3. Rate-limit (reusa a RPC já usada pelos formulários). Falha-aberta se a RPC der erro.
    try {
      const { data: allowed, error: rlErr } = await supabase.rpc('check_rate_limit', {
        p_ip_address: clientIp(req),
        p_email: emailNorm,
        p_max_submissions: 8,
        p_time_window_hours: 1,
      });
      if (!rlErr && allowed === false) {
        return json({ success: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' }, 429);
      }
    } catch (_) { /* falha-aberta: não bloqueia captura por erro de rate-limit */ }

    // 4. Dedup de contato por e-mail (reutiliza o lead existente; preenche lacunas)
    let contatoId: string | null = null;
    if (emailNorm) {
      const { data: existente } = await supabase
        .from('crm_contatos')
        .select('id, telefone')
        .ilike('email', emailNorm)
        .limit(1)
        .maybeSingle();
      if (existente?.id) {
        contatoId = existente.id;
        await supabase.from('crm_contatos').update({
          nome,
          telefone: existente.telefone ?? telefone ?? null,
          // origem/UTM da 1ª captura são preservadas; só completa se vier algo novo relevante
        }).eq('id', contatoId);
      }
    }
    if (!contatoId) {
      const { data: novo, error: insErr } = await supabase
        .from('crm_contatos')
        .insert({
          nome,
          email: emailNorm,
          telefone: telefone ?? null,
          origem: origemFinal,
          utm_source: utm_source ?? null,
          utm_medium: utm_medium ?? null,
          utm_campaign: utm_campaign ?? null,
          utm_term: utm_term ?? null,
          utm_content: utm_content ?? null,
          observacoes: observacoes ?? null,
        })
        .select('id')
        .single();
      if (insErr || !novo) throw new Error(`Erro ao criar contato: ${insErr?.message}`);
      contatoId = novo.id;
    }

    // 5. Etapa de entrada = etapa ativa de menor ordem (default: "Novo Lead")
    const { data: etapa } = await supabase
      .from('crm_etapas')
      .select('id')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .limit(1)
      .maybeSingle();

    // 6. Evita deal duplicado: se já há negócio ABERTO para o contato, não cria outro
    const { data: dealAberto } = await supabase
      .from('crm_negocios')
      .select('id')
      .eq('contato_id', contatoId)
      .eq('status', 'aberto')
      .limit(1)
      .maybeSingle();

    let negocioId = dealAberto?.id ?? null;
    if (!negocioId) {
      const { data: deal, error: dealErr } = await supabase
        .from('crm_negocios')
        .insert({
          contato_id: contatoId,
          titulo: titulo ?? `Endereço Fiscal — ${nome}`,
          etapa_id: etapa?.id ?? null,
          status: 'aberto',
        })
        .select('id')
        .single();
      if (dealErr || !deal) throw new Error(`Erro ao criar negócio: ${dealErr?.message}`);
      negocioId = deal.id;

      // 7. Atividade inicial automática (rastro da origem)
      await supabase.from('crm_atividades').insert({
        negocio_id: negocioId,
        tipo: 'nota',
        descricao: `Lead recebido via ${origemFinal}${utm_campaign ? ` · campanha: ${utm_campaign}` : ''}.`,
        concluida: true,
      });
    }

    return json({ success: true, contato_id: contatoId, negocio_id: negocioId });
  } catch (error) {
    console.error('Erro em capturar-lead:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
