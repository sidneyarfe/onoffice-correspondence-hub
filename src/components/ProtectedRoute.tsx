
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType: 'client' | 'admin';
}

const ProtectedRoute = ({ children, userType }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  const isAdminEmail = (email: string): boolean => {
    return email === 'onoffice1893@gmail.com' || 
           email === 'contato@onofficebelem.com.br' ||
           email.includes('@onoffice.com');
  };

  // Verificar se há sessão admin válida no localStorage
  const hasValidAdminSession = (): boolean => {
    try {
      const adminSession = localStorage.getItem('onoffice_admin_session');
      if (!adminSession) return false;

      const session = JSON.parse(adminSession);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      return session.isAdmin && (Date.now() - session.timestamp <= TWENTY_FOUR_HOURS);
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não há usuário no contexto mas há sessão admin válida, permitir acesso admin
  if (!user && hasValidAdminSession() && userType === 'admin') {
    console.log('ProtectedRoute - Sessão admin válida encontrada no localStorage');
    return <>{children}</>;
  }

  if (!user) {
    console.log('ProtectedRoute - Usuário não autenticado, redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute - Verificando acesso:', {
    userEmail: user.email,
    userType: user.type,
    requiredType: userType
  });

  // Verificar se o usuário tem o tipo correto
  if (userType === 'admin') {
    // Para admin, verificar tanto por email quanto por tipo ou sessão local
    const isAdmin = isAdminEmail(user.email) || user.type === 'admin' || hasValidAdminSession();
    
    if (!isAdmin) {
      console.log('Usuário não é admin, redirecionando para /cliente');
      return <Navigate to="/cliente" replace />;
    }
  } else if (userType === 'client') {
    // Para cliente, verificar se não é admin
    const isClient = !isAdminEmail(user.email) && user.type === 'client' && !hasValidAdminSession();
    
    if (!isClient) {
      console.log('Usuário não é cliente, redirecionando para /admin');
      return <Navigate to="/admin" replace />;
    }
  }

  console.log('ProtectedRoute - Acesso permitido para', userType);
  return <>{children}</>;
};

export default ProtectedRoute;
