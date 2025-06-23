
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType: 'client' | 'admin';
}

const ProtectedRoute = ({ children, userType }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

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
    return <Navigate to="/login" replace />;
  }

  // Verificar se o usuário tem o tipo correto
  if (userType === 'admin') {
    // Verificar se o email é de admin ou se tem role admin
    const isAdmin = user.email?.includes('@onoffice.com') || user.type === 'admin';
    if (!isAdmin) {
      return <Navigate to="/cliente" replace />;
    }
  } else if (userType === 'client') {
    // Verificar se é cliente
    const isClient = !user.email?.includes('@onoffice.com') && user.type === 'client';
    if (!isClient) {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
