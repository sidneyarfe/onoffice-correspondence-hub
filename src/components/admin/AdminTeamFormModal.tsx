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
import { useAdminTeam } from '@/hooks/useAdminTeam';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';

interface AdminTeamFormModalProps {
  open: boolean;
  onClose: () => void;
}

const AdminTeamFormModal: React.FC<AdminTeamFormModalProps> = ({
  open,
  onClose,
}) => {
  const { createAdmin, isCreatingAdmin } = useAdminTeam();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.full_name || !formData.password) {
      return;
    }

    createAdmin(formData);
    
    // Reset form and close modal
    setFormData({
      email: '',
      full_name: '',
      password: '',
    });
    onClose();
  };

  const handleClose = () => {
    setFormData({
      email: '',
      full_name: '',
      password: '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Administrador</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Digite o email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha Temporária</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Digite ou gere uma senha"
                required
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
            <p className="text-xs text-muted-foreground">
              O administrador deverá alterar esta senha no primeiro login
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isCreatingAdmin || !formData.email || !formData.full_name || !formData.password}
            >
              {isCreatingAdmin ? 'Criando...' : 'Criar Administrador'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminTeamFormModal;