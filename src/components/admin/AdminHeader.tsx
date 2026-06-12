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
    <header className="border-b border-border bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-gray-500 hover:text-on-dark" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-on-dark">
              Painel Administrativo
            </h1>
            <p className="text-sm text-gray-500">Bem-vindo, {user?.name}!</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-on-dark text-sm font-bold text-on-lime"
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

export default AdminHeader;
