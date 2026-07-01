import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Activity, Check, Eye, EyeOff, Globe, KeyRound, Mail, UserCog, X } from 'lucide-react';
import { AdminUser } from '@/hooks/useAdminTeam';
import { useAdminActivities } from '@/hooks/useAdminActivities';
import { humanizarAcao } from '@/utils/atividade';
import { initials, avatarColor } from '@/components/admin/clientes/clientesShared';

interface AdminEditModalProps {
  open: boolean;
  onClose: () => void;
  admin: AdminUser;
  onUpdate: (adminId: string, data: { full_name: string; email: string }) => void;
  onSetPassword: (userId: string, newPassword: string) => void;
  onSendPasswordReset: (email: string) => void;
  isUpdating?: boolean;
  isSettingPassword?: boolean;
  isSendingPasswordReset?: boolean;
}

type Tab = 'dados' | 'senha' | 'atividades';

const inputCls =
  'h-10 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] px-3 text-[13.5px] outline-none transition-colors focus:border-on-lime/50';
const labelCls = 'mb-1.5 block text-[11.5px] font-medium text-muted-foreground';

const acaoColor = (acao: string) => {
  const a = acao.toLowerCase();
  if (a.includes('login')) return 'bg-on-lime/15 text-on-lime';
  if (a.includes('cri') || a.includes('insert') || a.includes('emit')) return 'bg-blue-500/15 text-blue-300';
  if (a.includes('alter') || a.includes('update') || a.includes('edit') || a.includes('notif')) return 'bg-amber-400/15 text-amber-300';
  if (a.includes('exclu') || a.includes('delete') || a.includes('cancel')) return 'bg-red-500/15 text-red-300';
  return 'bg-white/10 text-foreground';
};

const Atividades: React.FC<{ adminId: string }> = ({ adminId }) => {
  const { activities, isLoading, error } = useAdminActivities(adminId);

  if (isLoading) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-on-lime" />
        <p className="text-[13px] text-muted-foreground">Carregando atividades...</p>
      </div>
    );
  }
  if (error) {
    return <div className="py-10 text-center text-[13px] text-red-400">Erro ao carregar atividades: {error}</div>;
  }
  if (activities.length === 0) {
    return (
      <div className="py-10 text-center">
        <Activity className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
        <p className="text-[13px] text-muted-foreground">Nenhuma atividade registrada para este administrador.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {activities.map((a) => (
        <div key={a.id} className="rounded-xl border border-white/[0.06] bg-white/[0.015] px-3.5 py-2.5">
          <div className="mb-1 flex items-center gap-2">
            <span className={`on-pill text-[10.5px] ${acaoColor(a.acao)}`}>{humanizarAcao(a.acao)}</span>
            <span className="on-num ml-auto text-[10.5px] text-muted-foreground/60">
              {new Date(a.data_atividade).toLocaleString('pt-BR')}
            </span>
          </div>
          <p className="text-[12.5px] leading-snug text-foreground/90">{a.descricao}</p>
          {a.ip_address && (
            <div className="mt-1 flex items-center gap-1 text-[10.5px] text-muted-foreground/60">
              <Globe className="h-3 w-3" /> <span className="on-num">{a.ip_address}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const AdminEditModal: React.FC<AdminEditModalProps> = ({
  open,
  onClose,
  admin,
  onUpdate,
  onSetPassword,
  onSendPasswordReset,
  isUpdating = false,
  isSettingPassword = false,
  isSendingPasswordReset = false,
}) => {
  const [tab, setTab] = useState<Tab>('dados');
  const [formData, setFormData] = useState({ full_name: admin.full_name || '', email: admin.email || '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setTab('dados');
      setFormData({ full_name: admin.full_name || '', email: admin.email || '' });
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
    }
  }, [open, admin]);

  const nome = admin.full_name || admin.email;
  const color = avatarColor(nome);

  const senhaValida = newPassword.length >= 8 && newPassword === confirmPassword;
  const mismatch = !!newPassword && !!confirmPassword && newPassword !== confirmPassword;

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(admin.id, formData);
  };
  const handleSetPassword = () => {
    if (!senhaValida) return;
    onSetPassword(admin.id, newPassword);
    setNewPassword('');
    setConfirmPassword('');
  };

  const tabs = useMemo(
    () =>
      [
        { key: 'dados' as Tab, label: 'Dados', icon: UserCog },
        { key: 'senha' as Tab, label: 'Senha', icon: KeyRound },
        { key: 'atividades' as Tab, label: 'Atividades', icon: Activity },
      ],
    [],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-[520px] gap-0 overflow-hidden border-white/10 bg-card p-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.7rem] text-[15px] font-bold"
            style={{ background: `${color}22`, color, border: `1px solid ${color}33` }}
          >
            {initials(nome)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{admin.full_name || 'Administrador'}</h2>
            <p className="on-num truncate text-[12.5px] text-muted-foreground">{admin.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/[0.06] px-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative flex cursor-pointer items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition-colors ${
                tab === t.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
              {tab === t.key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-on-lime" />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
          {tab === 'dados' && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label htmlFor="ae-name" className={labelCls}>Nome completo</label>
                <input
                  id="ae-name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label htmlFor="ae-email" className={labelCls}>E-mail</label>
                <input
                  id="ae-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className={`${inputCls} on-num`}
                  required
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> {isUpdating ? 'Salvando…' : 'Salvar dados'}
                </button>
              </div>
            </form>
          )}

          {tab === 'senha' && (
            <div className="space-y-5">
              <section>
                <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                  <KeyRound className="h-3.5 w-3.5" /> Definir nova senha
                </div>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="ae-pass" className={labelCls}>Nova senha</label>
                    <div className="relative">
                      <input
                        id="ae-pass"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className={`${inputCls} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                        title={showPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ae-pass2" className={labelCls}>Confirmar nova senha</label>
                    <input
                      id="ae-pass2"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Digite novamente"
                      className={inputCls}
                    />
                    {mismatch && <p className="mt-1 text-[11.5px] text-red-300">As senhas não coincidem.</p>}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSetPassword}
                      disabled={isSettingPassword || !senhaValida}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <KeyRound className="h-4 w-4" /> {isSettingPassword ? 'Alterando…' : 'Alterar senha'}
                    </button>
                  </div>
                </div>
              </section>

              <section className="border-t border-white/[0.06] pt-4">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                  <Mail className="h-3.5 w-3.5" /> Link de redefinição
                </div>
                <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">
                  Envia um e-mail para <span className="on-num text-foreground">{admin.email}</span> com link para o próprio
                  administrador redefinir a senha.
                </p>
                <button
                  type="button"
                  onClick={() => onSendPasswordReset(admin.email)}
                  disabled={isSendingPasswordReset}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" /> {isSendingPasswordReset ? 'Enviando…' : 'Enviar link de redefinição'}
                </button>
              </section>
            </div>
          )}

          {tab === 'atividades' && <Atividades adminId={admin.id} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminEditModal;
