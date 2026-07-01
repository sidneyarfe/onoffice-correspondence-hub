import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Configuração via env (.env: VITE_SUPABASE_*) com fallback para o projeto de produção.
// Usa a NOVA publishable key (sb_publishable_…) — pública por design, protegida por RLS.
// Independente do JWT secret legacy: rotacionar/desativar as chaves legacy NÃO a afeta.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://ifpqrugbpzqpapoaameo.supabase.co";

// Publishable key nova de produção (pública por design).
const FALLBACK_PUBLISHABLE_KEY = "sb_publishable_DMfr4EQzwiQkh2iLmA1yBQ_7E6vB9f1";

// As chaves legacy (JWT no formato `eyJ…`, role anon/service_role) foram DESATIVADAS no
// projeto. Se algum .env/ambiente ainda injetar uma legacy, IGNORAMOS para o auth nunca mais
// quebrar com "Legacy API keys are disabled" — só aceitamos a publishable nova (sb_…).
const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const isLegacyJwtKey = (k?: string) => !!k && k.startsWith("eyJ");
if (isLegacyJwtKey(envKey)) {
  console.warn(
    "[supabase] VITE_SUPABASE_PUBLISHABLE_KEY é uma legacy key (eyJ…) desativada — usando a publishable nova.",
  );
}
export const SUPABASE_PUBLISHABLE_KEY =
  (!isLegacyJwtKey(envKey) && envKey) || FALLBACK_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
