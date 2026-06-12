import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  DollarSign,
  BarChart3,
  LogOut,
  Package,
  UserCog
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';

const AdminSidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    {
      title: 'Dashboard',
      url: '/admin',
      icon: LayoutDashboard,
    },
    {
      title: 'Clientes',
      url: '/admin/clientes',
      icon: Users,
    },
    {
      title: 'Produtos e Serviços',
      url: '/admin/produtos',
      icon: Package,
    },
    {
      title: 'Correspondências',
      url: '/admin/correspondencias',
      icon: Mail,
    },
    {
      title: 'Documentos',
      url: '/admin/documentos',
      icon: FileText,
    },
    {
      title: 'Financeiro',
      url: '/admin/financeiro',
      icon: DollarSign,
    },
    {
      title: 'Equipe',
      url: '/admin/equipe',
      icon: UserCog,
    },
    {
      title: 'Relatórios',
      url: '/admin/relatorios',
      icon: BarChart3,
    },
  ];

  const handleLogout = () => {
    // AuthContext encerra a sessão Supabase e redireciona para /login
    void logout();
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-6 py-6">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="on-pill bg-on-dark text-white">Admin</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          Gestão
        </p>
        <SidebarMenu className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className={`h-11 w-full justify-start rounded-xl px-4 transition-colors duration-200 ${
                    isActive
                      ? 'bg-on-lime font-semibold text-on-black shadow-sm hover:bg-on-lime'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-on-dark'
                  }`}
                >
                  <Link to={item.url} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <button
          onClick={handleLogout}
          className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-4 text-red-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
