
import React from 'react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationsPopup from './NotificationsPopup';

const ClientHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Extrair nome do usuário do email se name não estiver disponível
  const getUserDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.email) {
      // Extrair parte antes do @ do email
      const emailPart = user.email.split('@')[0];
      return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
    }
    return 'Usuário';
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-xl font-semibold text-on-dark">
              Olá, {getUserDisplayName()}!
            </h1>
            <p className="text-sm text-gray-600">{user?.company || user?.email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <NotificationsPopup />
          
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ClientHeader;
