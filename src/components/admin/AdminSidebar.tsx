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
  UserCog,
  KanbanSquare,
  Contact,
  type LucideIcon,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';

type NavItem = { title: string; url: string; icon: LucideIcon };
type NavGroup = { label: string | null; items: NavItem[] };

// Navegação por módulos: Geral (Dashboard) · Comercial (CRM/Contatos) · Operacional (o resto)
const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ title: 'Dashboard', url: '/admin', icon: LayoutDashboard }],
  },
  {
    label: 'Comercial',
    items: [
      { title: 'CRM', url: '/admin/crm', icon: KanbanSquare },
      { title: 'Contatos', url: '/admin/contatos', icon: Contact },
    ],
  },
  {
    label: 'Operacional',
    items: [
      { title: 'Clientes', url: '/admin/clientes', icon: Users },
      { title: 'Produtos e Serviços', url: '/admin/produtos', icon: Package },
      { title: 'Correspondências', url: '/admin/correspondencias', icon: Mail },
      { title: 'Documentos', url: '/admin/documentos', icon: FileText },
      { title: 'Financeiro', url: '/admin/financeiro', icon: DollarSign },
      { title: 'Equipe', url: '/admin/equipe', icon: UserCog },
      { title: 'Relatórios', url: '/admin/relatorios', icon: BarChart3 },
    ],
  },
];

const AdminSidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    // AuthContext encerra a sessão Supabase e redireciona para /login
    void logout();
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-6 py-6">
        <div className="flex items-center gap-3">
          <Logo size="sm" variant="light" />
          <span className="on-pill bg-on-lime/15 text-on-lime">Admin</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        {navGroups.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className={gi > 0 ? 'mt-5' : ''}>
            {group.label && (
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
            )}
            <SidebarMenu className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  item.url === '/admin'
                    ? location.pathname === '/admin'
                    : location.pathname === item.url || location.pathname.startsWith(item.url + '/');
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`h-11 w-full justify-start rounded-md px-4 transition-colors duration-200 ${
                        isActive
                          ? 'on-glow-sm bg-on-lime font-semibold text-on-black hover:bg-on-lime'
                          : 'text-sidebar-foreground hover:bg-white/[0.06] hover:text-foreground'
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
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <button
          onClick={handleLogout}
          className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-md px-4 text-red-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
