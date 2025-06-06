
const SUPABASE_URL = "https://ifpqrugbpzqpapoaameo.supabase.co";

export const API_ENDPOINTS = {
  processarContratacao: `${SUPABASE_URL}/functions/v1/processar-contratacao`,
};

// Função helper para fazer chamadas às Edge Functions
export const callEdgeFunction = async (endpoint: string, data: any) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmcHFydWdicHpxcGFwb2FhbWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NjA1NDYsImV4cCI6MjA2NDAzNjU0Nn0.JsjSsicthW1dYaPbKZCOoQBvwZ_tJ3fnATqZpubfZhI`
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
};
