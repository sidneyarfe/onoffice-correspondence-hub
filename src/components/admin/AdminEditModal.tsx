import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AdminUser } from '@/hooks/useAdminTeam';
import { Mail } from 'lucide-react';

interface AdminEditModalProps {
  open: boolean;
  onClose: () => void;
  admin: AdminUser;
  onUpdate: (adminId: string, data: { full_name: string; email: string }) => void;
  onSendPasswordReset: (email: string) => void;
  isUpdating?: boolean;
  isSendingPasswordReset?: boolean;
}

const AdminEditModal: React.FC<AdminEditModalProps> = ({
  open,
  onClose,
  admin,
  onUpdate,
  onSendPasswordReset,
  isUpdating = false,
  isSendingPasswordReset = false,
}) => {
  const [formData, setFormData] = useState({
    full_name: admin.full_name || '',
    email: admin.email || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(admin.id, formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePasswordReset = () => {
    onSendPasswordReset(admin.email);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Administrador</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Dados Básicos */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="submit"
                disabled={isUpdating}
                size="sm"
              >
                {isUpdating ? 'Atualizando...' : 'Atualizar Dados'}
              </Button>
            </div>
          </form>

          <Separator />

          {/* Redefinir Senha */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Redefinir Senha</Label>
              <p className="text-sm text-muted-foreground">
                Envie um email com link para redefinição de senha para <strong>{admin.email}</strong>
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handlePasswordReset}
                disabled={isSendingPasswordReset}
                size="sm"
              >
                <Mail className="mr-2 h-4 w-4" />
                {isSendingPasswordReset ? 'Enviando...' : 'Enviar Link de Reset'}
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating || isSendingPasswordReset}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminEditModal;