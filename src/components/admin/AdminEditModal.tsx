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
import { AdminUser } from '@/hooks/useAdminTeam';

interface AdminEditModalProps {
  open: boolean;
  onClose: () => void;
  admin: AdminUser;
  onUpdate: (adminId: string, data: { full_name: string; email: string }) => void;
  isUpdating?: boolean;
}

const AdminEditModal: React.FC<AdminEditModalProps> = ({
  open,
  onClose,
  admin,
  onUpdate,
  isUpdating = false,
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Administrador</DialogTitle>
        </DialogHeader>
        
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
            >
              {isUpdating ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminEditModal;