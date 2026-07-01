// ============================================================================
// Anexos — regras compartilhadas de upload de arquivo (correspondências e
// documentos). Ponto único de verdade para "quais formatos são aceitos", para
// não divergir entre os vários modais. Regra do produto: PDF e IMAGENS sempre
// devem funcionar (além de Word/Excel nos documentos). Imagens cobrem qualquer
// subtipo — jpg, png, webp, gif, heic (foto de iPhone), etc. — via `image/*`.
// ============================================================================

/** Tamanho máximo padrão de anexo (10MB). */
export const MAX_ANEXO_BYTES = 10 * 1024 * 1024;

/**
 * Valor do atributo `accept` do <input type="file">. Inclui `image/*` (garante
 * QUALQUER imagem, inclusive webp/heic) + PDF + Office. Mantém as extensões
 * explícitas porque alguns navegadores/OS filtram melhor por extensão.
 */
export const ACCEPT_ANEXO =
  'image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.doc,.docx,.xls,.xlsx';

/** Variante só imagens + PDF (correspondências não precisam de Office). */
export const ACCEPT_ANEXO_CORRESPONDENCIA =
  'image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic';

const DOC_MIME_TYPES = new Set<string>([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const DOC_EXTENSIONS = /\.(pdf|jpe?g|png|webp|gif|heic|heif|doc|docx|xls|xlsx)$/i;

/**
 * Diz se o arquivo é um anexo permitido. Aceita QUALQUER imagem (`image/*`),
 * PDF e documentos Office. Usa a extensão como fallback quando o browser não
 * informa o MIME (comum com .heic e alguns .webp), evitando o falso-negativo
 * "só PDF funciona".
 */
export const isAnexoPermitido = (file: File): boolean => {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  if (DOC_MIME_TYPES.has(type)) return true;
  // Fallback por extensão (MIME ausente/genérico como application/octet-stream)
  return DOC_EXTENSIONS.test(file.name || '');
};
