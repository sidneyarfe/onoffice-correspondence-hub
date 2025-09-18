
import { Home, FileText, Mail, CreditCard, User } from 'lucide-react';
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
    url: '/cliente',
    icon: Home,
  },
  {
    title: 'Meus Documentos',
    url: '/cliente/documentos',
    icon: FileText,
  },
  {
    title: 'Correspondências',
    url: '/cliente/correspondencias',
    icon: Mail,
  },
  {
    title: 'Financeiro',
    url: '/cliente/financeiro',
    icon: CreditCard,
    disabled: true,
  },
  {
    title: 'Meu Perfil',
    url: '/cliente/perfil',
    icon: User,
  },
];

const ClientSidebar = () => {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <Logo size="md" />
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild={!item.disabled}
                    className={`w-full justify-start ${
                      item.disabled 
                        ? 'opacity-50 cursor-not-allowed text-gray-400' 
                        : 'hover:bg-on-lime/10 hover:text-on-lime'
                    } ${
                      location.pathname === item.url
                        ? 'bg-on-lime/10 text-on-lime border-r-2 border-on-lime'
                        : 'text-gray-700'
                    }`}
                  >
                    {item.disabled ? (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium flex-1">{item.title}</span>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">Em breve</span>
                      </div>
                    ) : (
                      <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium flex-1">{item.title}</span>
                      </Link>
                    )}
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

export default ClientSidebar;
