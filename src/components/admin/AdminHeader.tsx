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
    <header className="on-glass sticky top-0 z-20 border-b border-white/[0.08] bg-background/80 px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-muted-foreground transition-colors hover:text-foreground" />
          {/* Barra utilitária — o título de cada tela vive no conteúdo da página */}
          <span className="hidden text-xs font-medium uppercase tracking-wider text-muted-foreground sm:inline">
            Painel Administrativo
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-foreground">
              {user?.name || 'Administrador'}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">Administrador</p>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border border-on-lime/40 bg-on-lime/15 text-sm font-bold text-on-lime"
            aria-hidden="true"
          >
            {getInitials()}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex cursor-pointer items-center gap-2 rounded-md transition-colors duration-150"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
