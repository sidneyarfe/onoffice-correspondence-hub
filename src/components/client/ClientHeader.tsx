import React from 'react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import NotificationsPopup from './NotificationsPopup';

const ClientHeader = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  // Extrair nome do usuário do email se name não estiver disponível
  const getUserDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.email) {
      const emailPart = user.email.split('@')[0];
      return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
    }
    return 'Usuário';
  };

  const getInitials = () => {
    return getUserDisplayName()
      .split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="on-glass border-b border-white/[0.08] bg-background/80 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <div>
            {/* h1 da tela vive no conteúdo (hero) — aqui é apenas identificação */}
            <p className="font-outfit text-lg font-semibold tracking-tight text-foreground">
              Olá, {getUserDisplayName()}!
            </p>
            <p className="text-sm text-muted-foreground">{user?.company || user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationsPopup />

          <div
            className="on-glow-sm flex h-10 w-10 items-center justify-center rounded-full bg-on-lime text-sm font-bold text-on-black"
            aria-hidden="true"
          >
            {getInitials()}
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ClientHeader;
