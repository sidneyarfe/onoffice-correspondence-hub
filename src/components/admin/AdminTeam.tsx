import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, UserCog, Mail, Calendar, MoreHorizontal, Edit, Activity } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminTeam, AdminUser } from '@/hooks/useAdminTeam';
import AdminTeamFormModal from './AdminTeamFormModal';
import AdminEditModal from './AdminEditModal';
import AdminActivityModal from './AdminActivityModal';
import { SyncAdminModal } from './SyncAdminModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminTeam = () => {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [viewingActivities, setViewingActivities] = useState<AdminUser | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const { 
    admins, 
    isLoading, 
    updateAdminStatus, 
    isUpdatingStatus, 
    updateAdmin, 
    isUpdatingAdmin,
    sendPasswordReset,
    isSendingPasswordReset
  } = useAdminTeam();

  const handleToggleStatus = (adminId: string, currentStatus: boolean) => {
    updateAdminStatus({ id: adminId, is_active: !currentStatus });
  };

  const handleUpdateAdmin = (adminId: string, data: { full_name: string; email: string }) => {
    updateAdmin({ id: adminId, data });
    setEditingAdmin(null);
  };

  const handleSendPasswordReset = (email: string) => {
    sendPasswordReset(email);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Equipe</h1>
        </div>
        <div className="text-center py-8">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipe</h1>
          <p className="text-muted-foreground">
            Gerencie os administradores do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsFormModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Administrador
          </Button>
          <Button variant="outline" onClick={() => setShowSyncModal(true)}>
            Sincronizar Admin
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {admins.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum administrador encontrado</p>
              <p className="text-muted-foreground mb-4">
                Comece criando o primeiro administrador da equipe
              </p>
              <Button onClick={() => setIsFormModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Administrador
              </Button>
            </CardContent>
          </Card>
        ) : (
          admins.map((admin) => (
            <Card key={admin.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{admin.full_name}</CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 mr-1" />
                        {admin.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                      {admin.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingAdmin(admin)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setViewingActivities(admin)}
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          Ver Atividades
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(admin.id, admin.is_active)}
                          disabled={isUpdatingStatus}
                        >
                          {admin.is_active ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Criado em</p>
                    <div className="flex items-center mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(admin.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Último login</p>
                    <div className="flex items-center mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      {admin.last_login_at 
                        ? format(new Date(admin.last_login_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : 'Nunca'
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AdminTeamFormModal
        open={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
      />

      {editingAdmin && (
        <AdminEditModal
          open={!!editingAdmin}
          onClose={() => setEditingAdmin(null)}
          admin={editingAdmin}
          onUpdate={handleUpdateAdmin}
          onSendPasswordReset={handleSendPasswordReset}
          isUpdating={isUpdatingAdmin}
          isSendingPasswordReset={isSendingPasswordReset}
        />
      )}

      {viewingActivities && (
        <AdminActivityModal
          open={!!viewingActivities}
          onClose={() => setViewingActivities(null)}
          admin={viewingActivities}
        />
      )}

      <SyncAdminModal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />
    </div>
  );
};

export default AdminTeam;