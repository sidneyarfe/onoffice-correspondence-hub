// Epic 004 — CRM. Interfaces locais + acessor "bridge" para as tabelas crm_*.
//
// As tabelas crm_* são criadas pela migration 20260624210000 (Story 4.0). Enquanto
// `supabase gen types` não é rodado de novo (gate da Story 4.0), elas NÃO existem no tipo
// `Database` gerado — então `supabase.from('crm_negocios')` não compila. Este módulo concentra
// essa lacuna em UM lugar: interfaces explícitas + `crmFrom()` (acessor não-tipado isolado).
// Depois do regen de types.ts, dá para migrar os callers para `supabase.from(...)` direto.

import { supabase } from './client';

export type CrmEtapaTipo = 'aberto' | 'ganho' | 'perdido';
export type CrmOrigem = 'google_ads' | 'meta_ads' | 'site' | 'manual' | 'indicacao' | 'outro';
export type CrmAtividadeTipo = 'nota' | 'ligacao' | 'reuniao' | 'whatsapp' | 'followup' | 'email';

export interface CrmEtapa {
  id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  tipo: CrmEtapaTipo;
  ativo: boolean;
}

export interface CrmTag {
  id: string;
  nome: string;
  cor: string | null;
}

export interface CrmContato {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  origem: CrmOrigem;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  observacoes: string | null;
  responsavel: string | null;
  contratacao_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmNegocio {
  id: string;
  contato_id: string;
  titulo: string;
  valor_centavos: number | null;
  etapa_id: string | null;
  plano_id: string | null;
  contratacao_id: string | null;
  status: CrmEtapaTipo;
  motivo_perda: string | null;
  responsavel: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
  // joins opcionais
  contato?: CrmContato | null;
  tags?: CrmTag[];
}

export interface CrmAtividade {
  id: string;
  negocio_id: string;
  tipo: CrmAtividadeTipo;
  descricao: string | null;
  data_atividade: string;
  concluida: boolean;
  responsavel: string | null;
  created_at: string;
}

// Acessor não-tipado isolado (ver cabeçalho). Um único ponto de `any` na base de código.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const crmFrom = (table: string): any =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

// Rótulos pt-BR para a UI
export const ORIGEM_LABEL: Record<CrmOrigem, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  site: 'Site',
  manual: 'Manual',
  indicacao: 'Indicação',
  outro: 'Outro',
};

export const ATIVIDADE_LABEL: Record<CrmAtividadeTipo, string> = {
  nota: 'Nota',
  ligacao: 'Ligação',
  reuniao: 'Reunião',
  whatsapp: 'WhatsApp',
  followup: 'Follow-up',
  email: 'E-mail',
};
