import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, current_user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (user_id === current_user_id) {
      return new Response(
        JSON.stringify({ error: 'Você não pode excluir seu próprio usuário' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key
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

    // Check if user exists and has admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Usuário não é um administrador' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is the last admin
    const { count: adminCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (adminCount && adminCount <= 1) {
      return new Response(
        JSON.stringify({ error: 'Não é possível excluir o último administrador do sistema' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting admin user: ${profile.email} (${user_id})`);

    // Delete user from auth.users (profile will be deleted automatically via CASCADE)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao excluir usuário do sistema de autenticação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Admin user deleted successfully: ${profile.email}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Administrador excluído com sucesso',
        deleted_email: profile.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-admin-auth-user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
