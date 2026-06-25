import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Configuração via env (.env: VITE_SUPABASE_*) com fallback para o projeto de produção.
// Usa a NOVA publishable key (sb_publishable_…) — pública por design, protegida por RLS.
// Independente do JWT secret legacy: rotacionar/desativar as chaves legacy NÃO a afeta.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://ifpqrugbpzqpapoaameo.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_DMfr4EQzwiQkh2iLmA1yBQ_7E6vB9f1";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
