import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.10';

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
    const { email, password, full_name } = await req.json();

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email, password and full_name are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('=== CREATING ADMIN AUTH USER ===');
    console.log('Email:', email);
    console.log('Full Name:', full_name);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error checking existing users: ${listError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const existingUser = existingUsers.users.find(user => user.email === email);

    if (existingUser) {
      console.log('User already exists, updating password...');
      
      // Update existing user's password
      const { data: updateData, error: updateError } = await supabaseClient.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: password,
          user_metadata: { full_name: full_name }
        }
      );

      if (updateError) {
        console.error('Error updating user:', updateError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error updating user: ${updateError.message}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Update profile entry
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: existingUser.id,
          email: email,
          full_name: full_name,
          role: 'admin'
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Don't fail the operation, just log the warning
      }

      console.log('✅ Admin user updated successfully');
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Admin user updated successfully',
          user_id: existingUser.id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else {
      console.log('Creating new admin user...');
      
      // Create new user
      const { data: createData, error: createError } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { full_name: full_name }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error creating user: ${createError.message}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('User created with ID:', createData.user.id);

      // Create profile entry
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: createData.user.id,
          email: email,
          full_name: full_name,
          role: 'admin'
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Don't fail the operation, just log the warning
      }

      console.log('✅ Admin user created successfully');
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Admin user created successfully',
          user_id: createData.user.id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});