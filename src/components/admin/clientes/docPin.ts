// Fixa um documento (`documentos_cliente`) a uma assinatura SEM coluna nova: usa uma convenção
// na `descricao` (`ass:<id>|texto`). A descrição não é exibida ao cliente nem na lista de docs,
// então o token fica invisível na UI.

const PREFIX = 'ass:';
const SEP = '|';

export const pinDescricao = (assinaturaId: string, texto = ''): string => `${PREFIX}${assinaturaId}${SEP}${texto}`;

/** Extrai o id da assinatura à qual o documento está fixado (ou null). */
export const assinaturaIdDoDoc = (descricao?: string | null): string | null => {
  if (!descricao || !descricao.startsWith(PREFIX)) return null;
  const rest = descricao.slice(PREFIX.length);
  const i = rest.indexOf(SEP);
  return i >= 0 ? rest.slice(0, i) : rest;
};
