import React from 'react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';

const AdminHeader = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = () => {
    const name = user?.name || user?.email || 'Admin';
    return name
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
            {/* h1 da tela vive no conteúdo de cada página — aqui é apenas identificação */}
            <p className="text-lg font-semibold tracking-tight text-foreground">
              Painel Administrativo
            </p>
            <p className="text-sm text-muted-foreground">Bem-vindo, {user?.name}!</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border border-on-lime/40 bg-on-lime/15 text-sm font-bold text-on-lime"
            aria-hidden="true"
          >
            {getInitials()}
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
