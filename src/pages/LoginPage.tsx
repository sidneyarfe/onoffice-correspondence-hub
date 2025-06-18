
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import { useTemporaryPassword } from '@/hooks/useTemporaryPassword';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  const { loginWithTemporaryPassword } = useAuth();
  const { changePassword } = useTemporaryPassword();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginWithTemporaryPassword(email, password);
      
      if (result.success) {
        if (result.needsPasswordChange) {
          // Mostrar formulário de troca de senha
          setShowPasswordChange(true);
          setCurrentUserId(result.success ? email : ''); // Precisaremos do user ID real
          toast({
            title: "Primeiro acesso",
            description: "Por favor, defina uma nova senha para sua conta.",
          });
        } else {
          // Login normal - redirecionar
          toast({
            title: "Login realizado com sucesso!",
            description: "Redirecionando para o dashboard...",
          });
          
          setTimeout(() => {
            if (email === 'admin@onoffice.com') {
              navigate('/admin');
            } else {
              navigate('/cliente');
            }
          }, 500);
        }
      } else {
        toast({
          title: "Erro no login",
          description: "Email ou senha incorretos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Aqui precisamos do user ID real, não o email
      // Vamos usar a sessão atual do Supabase
      const { data: { user } } = await import('@/integrations/supabase/client').then(module => module.supabase.auth.getUser());
      
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const success = await changePassword(user.id, newPassword);
      
      if (success) {
        toast({
          title: "Senha alterada com sucesso!",
          description: "Redirecionando para o dashboard...",
        });
        
        setTimeout(() => {
          if (email === 'admin@onoffice.com') {
            navigate('/admin');
          } else {
            navigate('/cliente');
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showPasswordChange) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Logo size="lg" />
            <p className="mt-4 text-gray-600">Defina sua nova senha</p>
          </div>

          <Card className="on-card">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-on-dark">Primeira Alteração de Senha</CardTitle>
              <CardDescription className="text-center">
                Por questões de segurança, defina uma nova senha personalizada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Digite sua nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-12"
                    minLength={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirme sua nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12"
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full on-button h-12 text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Logo size="lg" />
          <p className="mt-4 text-gray-600">Acesse sua conta</p>
        </div>

        {/* Login Form */}
        <Card className="on-card">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-on-dark">Entrar</CardTitle>
            <CardDescription className="text-center">
              Digite suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                className="w-full on-button h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <a href="#" className="text-on-lime hover:underline">
                Esqueceu sua senha?
              </a>
            </div>

            <div className="mt-4 text-center text-sm text-gray-600">
              Não tem uma conta?{' '}
              <Link to="/planos" className="text-on-lime hover:underline">
                Contrate agora
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">Credenciais de Demonstração:</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Cliente:</strong> joao@empresa.com / 123456</p>
              <p><strong>Admin:</strong> admin@onoffice.com / 123456</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
