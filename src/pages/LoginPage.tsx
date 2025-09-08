import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const isAdminEmail = (email: string): boolean => {
    return email === 'onoffice1893@gmail.com' || 
           email === 'contato@onofficebelem.com.br' ||
           email === 'sidneyferreira12205@gmail.com' ||
           email.includes('@onoffice.com');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('=== INICIANDO LOGIN ===');
      console.log('Email:', email);
      
      const success = await login(email, password);
      
      if (success) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o dashboard...",
        });
        
        setTimeout(() => {
          if (isAdminEmail(email)) {
            console.log('Redirecionando admin para /admin');
            navigate('/admin');
          } else {
            console.log('Redirecionando cliente para /cliente');
            navigate('/cliente');
          }
        }, 1000);
      } else {
        toast({
          title: "Erro no login",
          description: "Email ou senha incorretos. Verifique suas credenciais e tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para preencher credenciais de demonstração
  const fillDemoCredentials = (demoType: 'client') => {
    if (demoType === 'client') {
      setEmail('joao@empresa.com');
      setPassword('demo123456');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Logo size="md" />
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
              <Link to="/forgot-password" className="text-on-lime hover:underline">
                Esqueceu sua senha?
              </Link>
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
            <h3 className="font-semibold text-blue-900 mb-3">Credenciais de Demonstração:</h3>
            <div className="space-y-3">
              <div 
                className="text-sm text-blue-800 p-2 bg-blue-100 rounded cursor-pointer hover:bg-blue-200 transition-colors"
                onClick={() => fillDemoCredentials('client')}
              >
                <p><strong>Cliente Demo:</strong> joao@empresa.com / demo123456</p>
                <p className="text-xs text-blue-600 mt-1">Clique para preencher automaticamente</p>
              </div>
              <div className="text-sm text-amber-800 p-2 bg-amber-100 rounded">
                <p><strong>Acesso Admin:</strong> Use o fluxo de recuperação de senha</p>
                <p className="text-xs text-amber-600 mt-1">Se necessário, use "Esqueceu sua senha?"</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
