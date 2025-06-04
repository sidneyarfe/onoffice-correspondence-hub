
import { Home, Users, Mail, CreditCard, FileText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import Logo from '@/components/Logo';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/admin',
    icon: Home,
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
    title: 'Financeiro',
    url: '/admin/financeiro',
    icon: CreditCard,
  },
  {
    title: 'Relatórios',
    url: '/admin/relatorios',
    icon: FileText,
  },
];

const AdminSidebar = () => {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <Logo size="md" />
        <p className="text-sm text-gray-600 mt-2">Painel Administrativo</p>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`w-full justify-start hover:bg-on-lime/10 hover:text-on-lime ${
                      location.pathname === item.url
                        ? 'bg-on-lime/10 text-on-lime border-r-2 border-on-lime'
                        : 'text-gray-700'
                    }`}
                  >
                    <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
