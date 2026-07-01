-- ============================================================================
-- Anexos — aceitar QUALQUER imagem (além de PDF/Office) em todos os buckets de
-- anexo. Os buckets listavam apenas `image/jpeg` e `image/png`; fotos de celular
-- (HEIC), prints (WEBP) e GIFs eram recusados no upload, dando a impressão de que
-- "só PDF funciona". Passa a usar o curinga `image/*` (suportado pelo Supabase
-- Storage) + os subtipos explícitos como reforço. O UPDATE também repara qualquer
-- drift de produção (bucket que tenha sido restringido manualmente no painel).
-- ============================================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/*',
  'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE id IN ('correspondencias', 'documentos', 'documentos_fiscais');

-- Rollback (se algum dia precisar restringir de novo):
--   UPDATE storage.buckets
--   SET allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png']
--   WHERE id IN ('correspondencias','documentos','documentos_fiscais');
