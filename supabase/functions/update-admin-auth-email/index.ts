import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, new_email } = await req.json();

    if (!user_id || !new_email) {
      throw new Error('user_id e new_email são obrigatórios');
    }

    console.log(`Atualizando email do usuário ${user_id} para ${new_email}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Atualizar email no auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { email: new_email }
    );

    if (authError) {
      console.error('Erro ao atualizar email no Auth:', authError);
      throw authError;
    }

    console.log(`Email atualizado com sucesso no Auth para ${new_email}`);

    // Atualizar email no profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: new_email, updated_at: new Date().toISOString() })
      .eq('id', user_id);

    if (profileError) {
      console.error('Erro ao atualizar email no profile:', profileError);
      throw profileError;
    }

    console.log(`Email atualizado com sucesso no profile para ${new_email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email atualizado com sucesso',
        user: authData.user
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na função update-admin-auth-email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
