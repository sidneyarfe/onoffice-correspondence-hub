import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

export const API_ENDPOINTS = {
  processarContratacao: `${SUPABASE_URL}/functions/v1/processar-contratacao`,
};

// Função helper para fazer chamadas às Edge Functions
export const callEdgeFunction = async (endpoint: string, data: unknown) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
};
