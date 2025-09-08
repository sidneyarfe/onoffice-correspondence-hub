import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncPasswordRequest {
  email: string;
  newPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, newPassword }: SyncPasswordRequest = await req.json();

    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`🔄 Sincronizando senha para admin: ${email}`);

    // Verificar se é um usuário admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (adminError || !adminUser) {
      console.log(`❌ Usuário ${email} não é admin, pulando sincronização`);
      return new Response(
        JSON.stringify({ success: true, message: 'Usuário não é admin, sincronização não necessária' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Atualizar senha no admin_users usando bcrypt
    const { error: updateError } = await supabase.rpc('update_admin_password', {
      p_email: email,
      p_new_password: newPassword
    });

    if (updateError) {
      console.error('❌ Erro ao atualizar senha admin:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao sincronizar senha admin' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`✅ Senha sincronizada com sucesso para admin: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Senha sincronizada com sucesso' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('❌ Erro na função sync-admin-password:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);