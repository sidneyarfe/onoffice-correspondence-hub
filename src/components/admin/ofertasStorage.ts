import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'ofertas';

/** Sobe uma imagem de oferta para o bucket público `ofertas` e devolve a URL pública. */
export async function uploadOfertaImagem(planoKey: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${planoKey || 'novas'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
