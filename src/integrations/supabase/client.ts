// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ifpqrugbpzqpapoaameo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmcHFydWdicHpxcGFwb2FhbWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NjA1NDYsImV4cCI6MjA2NDAzNjU0Nn0.JsjSsicthW1dYaPbKZCOoQBvwZ_tJ3fnATqZpubfZhI";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);