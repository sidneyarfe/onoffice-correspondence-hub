
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
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
  UserPlus
} from 'lucide-react';
import Logo from '@/components/Logo';

const AdminSidebar = () => {
  const location = useLocation();
  
  const menuItems = [
    {
      title: 'Dashboard',
      url: '/admin',
      icon: LayoutDashboard,
    },
    {
      title: 'Solicitações',
      url: '/admin/solicitacoes',
      icon: UserPlus,
    },
    {
      title: 'Clientes',
      url: '/admin/clientes',
      icon: Users,
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
      title: 'Relatórios',
      url: '/admin/relatorios',
      icon: BarChart3,
    },
  ];

  const handleLogout = () => {
    // Limpar dados de autenticação
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    
    // Redirecionar para login
    window.location.href = '/admin/login';
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8">
            <Logo />
          </div>
          <span className="font-bold text-on-dark">ON Office Admin</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild 
                isActive={location.pathname === item.url}
                className="w-full justify-start"
              >
                <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                  <item.icon className="w-5 h-5" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <div className="flex items-center gap-3 px-3 py-2">
                <LogOut className="w-5 h-5" />
                <span>Sair</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
