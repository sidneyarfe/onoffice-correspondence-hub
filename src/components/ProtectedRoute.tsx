
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
           email === 'sidneyferreira12205@gmail.com' ||
           email.includes('@onoffice.com');
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
    // Para admin, verificar tanto por email quanto por tipo
    const isAdmin = isAdminEmail(user.email) || user.type === 'admin';
    
    if (!isAdmin) {
      console.log('Usuário não é admin, redirecionando para /cliente');
      return <Navigate to="/cliente" replace />;
    }
  } else if (userType === 'client') {
    // Para cliente, verificar se não é admin
    const isClient = !isAdminEmail(user.email) && user.type === 'client';
    
    if (!isClient) {
      console.log('Usuário não é cliente, redirecionando para /admin');
      return <Navigate to="/admin" replace />;
    }
  }

  console.log('ProtectedRoute - Acesso permitido para', userType);
  return <>{children}</>;
};

export default ProtectedRoute;
