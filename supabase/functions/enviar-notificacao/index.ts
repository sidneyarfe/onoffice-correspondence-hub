// Edge Function: enviar-notificacao
// Envia um e-mail de notificação ao cliente (cobrança/fatura) via Resend.
// Best-effort do frontend: se não estiver deployada ou sem RESEND_API_KEY, o frontend ignora
// o erro e a notificação interna (tabela notificacoes) ainda é entregue.
//
// Deploy:  supabase functions deploy enviar-notificacao
// Secret:  supabase secrets set RESEND_API_KEY=...   (domínio verificado no Resend)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { user_id, email, titulo, mensagem } = await req.json();
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY ausente' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let to: string | undefined = email;
    if (!to && user_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data } = await supabase.from('contratacoes_clientes').select('email').eq('user_id', user_id).single();
      to = data?.email ?? undefined;
    }
    if (!to) {
      return new Response(JSON.stringify({ error: 'destinatário não encontrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ON Office <contato@onofficebelem.com.br>',
        to: [to],
        subject: titulo || 'ON Office',
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
          <p>${(mensagem || '').replace(/\n/g, '<br/>')}</p>
          <hr style="border:none;border-top:1px solid #eee"/>
          <p style="color:#888;font-size:12px">ON Office — escritório virtual e endereço fiscal.</p>
        </div>`,
      }),
    });
    const body = await res.json();
    return new Response(JSON.stringify({ ok: res.ok, body }), {
      status: res.ok ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
