import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Configuração via env (.env: VITE_SUPABASE_*) com fallback para o projeto de produção.
// A publishable/anon key é pública por design — RLS protege os dados.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://ifpqrugbpzqpapoaameo.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmcHFydWdicHpxcGFwb2FhbWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NjA1NDYsImV4cCI6MjA2NDAzNjU0Nn0.JsjSsicthW1dYaPbKZCOoQBvwZ_tJ3fnATqZpubfZhI";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
