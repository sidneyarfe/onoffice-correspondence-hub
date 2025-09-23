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
import { Eye, EyeOff, RefreshCw } from 'lucide-react';

interface AdminEditModalProps {
  open: boolean;
  onClose: () => void;
  admin: AdminUser;
  onUpdate: (adminId: string, data: { full_name: string; email: string }) => void;
  onUpdatePassword: (adminId: string, password: string) => void;
  isUpdating?: boolean;
  isUpdatingPassword?: boolean;
}

const AdminEditModal: React.FC<AdminEditModalProps> = ({
  open,
  onClose,
  admin,
  onUpdate,
  onUpdatePassword,
  isUpdating = false,
  isUpdatingPassword = false,
}) => {
  const [formData, setFormData] = useState({
    full_name: admin.full_name || '',
    email: admin.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasswordData(prev => ({ 
      ...prev, 
      newPassword: password,
      confirmPassword: password 
    }));
    setPasswordError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(admin.id, formData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordError('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    
    setPasswordError('');
    onUpdatePassword(admin.id, passwordData.newPassword);
    setPasswordData({ newPassword: '', confirmPassword: '' });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value,
    }));
    setPasswordError('');
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

          {/* Alterar Senha */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Alterar Senha</Label>
              <p className="text-sm text-muted-foreground">
                Defina uma nova senha para este administrador
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  placeholder="Digite a nova senha"
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateRandomPassword}
                    className="h-7 w-7 p-0"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-7 w-7 p-0"
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>

            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="submit"
                disabled={isUpdatingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                size="sm"
              >
                {isUpdatingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </form>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating || isUpdatingPassword}
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