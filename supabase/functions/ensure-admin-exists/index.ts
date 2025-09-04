import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminUser {
  email: string;
  password: string;
  full_name: string;
}

const ADMIN_USERS: AdminUser[] = [
  {
    email: 'onoffice1893@gmail.com',
    password: 'OnOffice2024!',
    full_name: 'OnOffice Admin Principal'
  },
  {
    email: 'onoffice1894@gmail.com', 
    password: 'OnOffice2025!',
    full_name: 'OnOffice Admin Secundário'
  },
  {
    email: 'contato@onofficebelem.com.br',
    password: 'OnOffice2025!',
    full_name: 'OnOffice Admin Contato'
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Usar Service Role Key para acesso completo ao auth.users
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { email } = await req.json();
    
    if (!email) {
      throw new Error('Email é obrigatório');
    }

    console.log('Verificando se admin existe:', email);

    // Buscar admin configuração
    const adminConfig = ADMIN_USERS.find(admin => admin.email === email);
    if (!adminConfig) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email não é um admin válido',
          status: 'not_admin'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    // Verificar se usuário já existe no auth.users usando listUsers
    console.log('Listando usuários para verificar existência...');
    const { data: usersList, error: listError } = await supabaseClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('Erro ao listar usuários:', listError);
      throw new Error(`Erro ao verificar usuários: ${listError.message}`);
    }

    // Procurar se o email já existe
    const existingUser = usersList.users.find(user => user.email === email);

    if (existingUser) {
      console.log('Admin já existe no auth.users:', existingUser.id);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Admin já existe no sistema',
          user_id: existingUser.id,
          status: 'exists'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        }
      );
    }

    // Criar novo usuário admin
    console.log('Criando novo admin no auth.users...');
    const { data: createData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: adminConfig.email,
      password: adminConfig.password,
      email_confirmed_at: new Date().toISOString(), // Auto-confirmar email
      user_metadata: {
        full_name: adminConfig.full_name,
        role: 'admin'  
      }
    });

    if (createError) {
      console.error('Erro ao criar usuário no auth.users:', createError);
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    console.log('Admin criado com sucesso:', createData.user?.id);

    // Criar/atualizar perfil na tabela profiles
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: createData.user!.id,
        email: adminConfig.email,
        full_name: adminConfig.full_name,
        role: 'admin'
      });

    if (profileError) {
      console.warn('Erro ao criar perfil (não crítico):', profileError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin criado com sucesso no sistema',
        user_id: createData.user!.id,
        status: 'created'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro na verificação/criação do admin:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        status: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
})