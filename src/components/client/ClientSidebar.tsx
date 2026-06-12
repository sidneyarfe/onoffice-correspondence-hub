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
        <Logo size="md" variant="light" />
      </div>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                      className={`h-11 w-full justify-start rounded-md px-4 transition-colors duration-200 ${
                        item.disabled
                          ? 'cursor-not-allowed text-muted-foreground/60'
                          : isActive
                            ? 'on-glow-sm bg-on-lime font-semibold text-on-black hover:bg-on-lime'
                            : 'text-sidebar-foreground hover:bg-white/[0.06] hover:text-foreground'
                      }`}
                    >
                      {item.disabled ? (
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          <span className="flex-1 font-medium">{item.title}</span>
                          <span className="on-pill bg-white/10 text-muted-foreground">Em breve</span>
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
          className="on-glass flex items-center gap-3 rounded-lg p-4 transition-colors duration-200 hover:border-on-lime/40"
        >
          <span className="on-tile bg-on-lime/15 text-on-lime">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">Precisa de ajuda?</span>
            <span className="block text-xs text-muted-foreground">Fale com nosso suporte</span>
          </span>
        </a>
      </SidebarFooter>
    </Sidebar>
  );
};

export default ClientSidebar;
