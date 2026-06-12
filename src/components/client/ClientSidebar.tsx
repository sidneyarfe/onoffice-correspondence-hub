import { Home, FileText, Mail, CreditCard, User, LifeBuoy } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <div className="px-6 py-6">
        <Logo size="md" />
      </div>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Menu principal
          </p>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={!item.disabled}
                      className={`h-11 w-full justify-start rounded-xl px-4 transition-colors duration-200 ${
                        item.disabled
                          ? 'cursor-not-allowed text-gray-400 opacity-60'
                          : isActive
                            ? 'bg-on-lime font-semibold text-on-black shadow-sm hover:bg-on-lime'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-on-dark'
                      }`}
                    >
                      {item.disabled ? (
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          <span className="flex-1 font-medium">{item.title}</span>
                          <span className="on-pill bg-gray-200 text-gray-600">Em breve</span>
                        </div>
                      ) : (
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          <span className="flex-1 font-medium">{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <a
          href="mailto:contato@onoffice.com.br"
          className="on-card flex items-center gap-3 p-4 hover:border-on-lime/60"
        >
          <span className="on-tile bg-on-lime/20 text-on-dark">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-on-dark">Precisa de ajuda?</span>
            <span className="block text-xs text-gray-500">Fale com nosso suporte</span>
          </span>
        </a>
      </SidebarFooter>
    </Sidebar>
  );
};

export default ClientSidebar;
