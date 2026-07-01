import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Edit, Plus, Search, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { useAdminTeam, AdminUser } from '@/hooks/useAdminTeam';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeRefetch } from '@/hooks/useRealtimeRefetch';
import { initials, avatarColor } from '@/components/admin/clientes/clientesShared';
import AdminTeamFormModal from './AdminTeamFormModal';
import AdminEditModal from './AdminEditModal';
import { DeleteAdminDialog } from './DeleteAdminDialog';

const iconBtn =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-muted-foreground';

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

const AdminTeam = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    admins,
    isLoading,
    updateAdmin,
    isUpdatingAdmin,
    setPassword,
    isSettingPassword,
    sendPasswordReset,
    isSendingPasswordReset,
    deleteAdmin,
    isDeletingAdmin,
  } = useAdminTeam();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState('');

  // Atualização ao vivo: quando profiles mudar (novo/edição/remoção de admin), recarrega a lista
  useRealtimeRefetch(['profiles'], () => queryClient.invalidateQueries({ queryKey: ['admin-team'] }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter(
      (a) => (a.full_name || '').toLowerCase().includes(q) || a.email.toLowerCase().includes(q),
    );
  }, [admins, search]);

  const novosEsteMes = useMemo(() => {
    const now = new Date();
    return admins.filter((a) => {
      const d = new Date(a.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [admins]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-on-lime" />
          <p className="text-muted-foreground">Carregando equipe...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Administradores', value: admins.length, color: 'text-foreground' },
    { label: 'Novos este mês', value: novosEsteMes, color: 'text-on-lime' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Equipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">Administradores com acesso ao painel da ON Office</p>
        </div>
        <button onClick={() => setIsFormModalOpen(true)} className="on-button inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo administrador
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="min-w-[150px] flex-1 rounded-xl border border-white/[0.08] bg-card px-4 py-3">
            <div className={`on-num text-[22px] font-medium leading-none ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          placeholder="Buscar por nome ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 border-white/10 bg-[#0e0e11] pl-9"
        />
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="bg-[#0e0e11]">
                <th className="px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Administrador
                </th>
                <th className="px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Função
                </th>
                <th className="px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Adicionado em
                </th>
                <th className="w-[140px] px-4 py-3 text-right text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((admin) => {
                const nome = admin.full_name || admin.email;
                const isYou = !!user && user.email?.toLowerCase() === admin.email.toLowerCase();
                const color = avatarColor(nome);
                return (
                  <tr key={admin.id} className="border-t border-white/[0.05] transition-colors hover:bg-white/[0.025]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.6rem] text-[13px] font-bold"
                          style={{ background: `${color}22`, color, border: `1px solid ${color}33` }}
                        >
                          {initials(nome)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="max-w-[220px] truncate text-[13.5px] font-semibold">{admin.full_name || 'Sem nome'}</span>
                            {isYou && (
                              <span className="on-pill bg-on-lime/15 text-[10px] text-on-lime">você</span>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground/80">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="on-pill bg-on-lime/15 text-[11px] text-on-lime">
                        <ShieldCheck className="h-3 w-3" /> Administrador
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="on-num text-[12.5px] text-muted-foreground">{fmtDate(admin.created_at)}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button className={iconBtn} title="Editar" onClick={() => setEditingAdmin(admin)}>
                          <Edit className="h-[15px] w-[15px]" />
                        </button>
                        <button
                          className={`${iconBtn} hover:border-red-500/50 hover:text-red-300`}
                          title={isYou ? 'Você não pode se excluir' : 'Excluir'}
                          disabled={isYou}
                          onClick={() => !isYou && setDeletingAdmin(admin)}
                        >
                          <Trash2 className="h-[15px] w-[15px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <UserCog className="mb-3 h-10 w-10 text-muted-foreground/60" />
            <p className="text-[15px] font-medium">
              {search.trim() ? 'Nenhum administrador com essa busca' : 'Nenhum administrador cadastrado'}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {search.trim() ? 'Tente limpar a busca.' : 'Comece criando o primeiro administrador da equipe.'}
            </p>
            {!search.trim() && (
              <button onClick={() => setIsFormModalOpen(true)} className="on-button mt-4 inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Criar administrador
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modais */}
      <AdminTeamFormModal open={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} />

      {editingAdmin && (
        <AdminEditModal
          open={!!editingAdmin}
          onClose={() => setEditingAdmin(null)}
          admin={editingAdmin}
          onUpdate={(adminId, data) => {
            updateAdmin({ id: adminId, data });
            setEditingAdmin(null);
          }}
          onSetPassword={(userId, newPassword) => setPassword({ userId, newPassword })}
          onSendPasswordReset={(email) => sendPasswordReset(email)}
          isUpdating={isUpdatingAdmin}
          isSettingPassword={isSettingPassword}
          isSendingPasswordReset={isSendingPasswordReset}
        />
      )}

      <DeleteAdminDialog
        open={!!deletingAdmin}
        onOpenChange={(open) => !open && setDeletingAdmin(null)}
        adminName={deletingAdmin?.full_name || ''}
        adminEmail={deletingAdmin?.email || ''}
        onConfirm={() => {
          if (deletingAdmin) {
            deleteAdmin(deletingAdmin.id);
            setDeletingAdmin(null);
          }
        }}
        isDeleting={isDeletingAdmin}
      />
    </div>
  );
};

export default AdminTeam;
