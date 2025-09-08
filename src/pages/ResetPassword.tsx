import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { validatePasswordStrength } from '@/utils/inputValidation';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<{
    isValid: boolean;
    issues: string[];
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          toast({
            title: "Erro no link",
            description: "Este link de recuperação é inválido ou expirou.",
            variant: "destructive",
          });
          navigate("/forgot-password");
        } else {
          console.log("✅ Sessão de recuperação iniciada");
        }
      });
    } else {
      toast({
        title: "Link inválido",
        description: "Este link de recuperação é inválido ou expirou.",
        variant: "destructive",
      });
      navigate("/forgot-password");
    }
  }, [navigate]);

  useEffect(() => {
    // Validar senha em tempo real
    if (password.length > 0) {
      validatePasswordStrength(password).then(setPasswordValidation);
    } else {
      setPasswordValidation(null);
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (passwordValidation && !passwordValidation.isValid) {
      toast({
        title: "Senha inválida",
        description: "A senha não atende aos critérios de segurança.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso. Redirecionando para o login...",
      });

      // Aguardar um pouco e redirecionar
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a senha.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Logo size="md" />
          <p className="mt-4 text-gray-600">Defina sua nova senha</p>
        </div>

        <Card className="on-card">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-on-dark">Nova Senha</CardTitle>
            <CardDescription className="text-center">
              Escolha uma senha segura para sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 w-12 px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Validação da senha */}
                {passwordValidation && (
                  <div className="text-xs space-y-1">
                    {passwordValidation.issues.map((issue, index) => (
                      <p key={index} className="text-red-600">• {issue}</p>
                    ))}
                    {passwordValidation.isValid && (
                      <p className="text-green-600">✓ Senha atende aos critérios de segurança</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 w-12 px-3 py-2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Validação da confirmação */}
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-600">As senhas não coincidem</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600">✓ Senhas coincidem</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full on-button h-12 text-lg"
                disabled={isLoading || !passwordValidation?.isValid || password !== confirmPassword}
              >
                {isLoading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/forgot-password')}
                className="text-on-lime hover:underline inline-flex items-center text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Solicitar novo link
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="text-sm text-amber-800 space-y-2">
              <p><strong>Critérios de segurança:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>Pelo menos 8 caracteres</li>
                <li>Uma letra maiúscula</li>
                <li>Uma letra minúscula</li>
                <li>Um número</li>
                <li>Um caractere especial</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;