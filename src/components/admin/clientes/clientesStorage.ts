import { supabase } from '@/integrations/supabase/client';

const AVATARS_BUCKET = 'avatars';
const CONTRATOS_BUCKET = 'contratos';

const sanitize = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]+/g, '_');

/** Sobe a foto do cliente para o bucket público `avatars` e devolve a URL pública (com cache-bust). */
export async function uploadAvatar(clientId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${clientId}.${ext}`;
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw error;
  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * Sobe o contrato assinado (PDF/imagem) para o bucket privado `contratos`.
 * Devolve a CHAVE do objeto (path dentro do bucket) — guardada em contratacoes_clientes.contrato_assinado_url.
 */
export async function uploadContrato(clientId: string, file: File): Promise<string> {
  const key = `${clientId}/${Date.now()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage.from(CONTRATOS_BUCKET).upload(key, file, {
    upsert: true,
    contentType: file.type || 'application/pdf',
  });
  if (error) throw error;
  return key;
}

/** Gera uma URL assinada temporária para o contrato privado e abre em nova aba. */
export async function abrirContratoAssinado(pathOrUrl: string): Promise<void> {
  // compat: se por acaso vier uma URL completa, abre direto
  if (/^https?:\/\//i.test(pathOrUrl)) {
    window.open(pathOrUrl, '_blank', 'noopener');
    return;
  }
  const { data, error } = await supabase.storage.from(CONTRATOS_BUCKET).createSignedUrl(pathOrUrl, 120);
  if (error || !data?.signedUrl) throw error || new Error('Não foi possível gerar o link do contrato');
  window.open(data.signedUrl, '_blank', 'noopener');
}
