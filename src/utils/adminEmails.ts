// Fonte ÚNICA da allowlist de administradores (não duplicar — importe daqui).
// Política: e-mails exatos OU domínio @onoffice.com OU profiles.role === 'admin'
// (esta última chega como user.type === 'admin' via AuthContext).

export const ADMIN_EMAILS: readonly string[] = [
  'onoffice1893@gmail.com',
  'contato@onofficebelem.com.br',
  'sidneyferreira12205@gmail.com',
];

export const ADMIN_EMAIL_DOMAIN = '@onoffice.com';

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalized) || normalized.includes(ADMIN_EMAIL_DOMAIN);
};

export const isAdminUser = (
  user?: { email?: string | null; type?: string } | null,
): boolean => !!user && (isAdminEmail(user.email) || user.type === 'admin');
