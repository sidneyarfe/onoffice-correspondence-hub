import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Mail } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    console.log('🔄 Iniciando recuperação de senha para:', email);

    try {
      // Enviar email de recuperação usando o Supabase Auth nativo
      console.log('📧 Enviando email de recuperação...');
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        console.error('❌ Erro do Supabase Auth:', error);
        throw error;
      }

      console.log('✅ Email enviado com sucesso');
      setEmailSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      
    } catch (error) {
      console.error('🚨 Erro na recuperação:', error);

      let errorMessage = "Não foi possível enviar o email de recuperação.";
      const message = error instanceof Error ? error.message : '';

      if (message.includes('rate limit')) {
        errorMessage = "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
      } else if (message.includes('Invalid email')) {
        errorMessage = "Email inválido. Verifique se o endereço está correto.";
      } else if (message.includes('User not found')) {
        errorMessage = "Email não encontrado em nossa base de dados.";
      } else if (message) {
        errorMessage = message;
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen on-mesh bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Logo size="md" variant="light" />
          </div>

          <Card className="on-card">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-on-lime/15 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-on-lime" />
              </div>
              <CardTitle className="text-2xl text-foreground">Email Enviado</CardTitle>
              <CardDescription>
                Enviamos um link de recuperação para <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
                <p>Se não receber o email em alguns minutos, verifique sua pasta de spam.</p>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full"
                >
                  Tentar outro email
                </Button>
                
                <Link to="/login" className="block">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen on-mesh bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Logo size="md" variant="light" />
          <p className="mt-4 text-muted-foreground">Recupere sua senha</p>
        </div>

        <Card className="on-card">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-foreground">Esqueceu sua senha?</CardTitle>
            <CardDescription className="text-center">
              Digite seu email para receber um link de recuperação
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

              <Button
                type="submit"
                className="w-full on-button h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-on-lime hover:underline inline-flex items-center text-sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar ao login
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-300 space-y-2">
              <p><strong>Sistema Simplificado:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-blue-300">
                <li>O link de recuperação expira em 1 hora</li>
                <li>Funciona para todas as contas (cliente e admin)</li>
                <li>Se não receber o email, verifique a pasta de spam</li>
                <li>Sistema unificado usando apenas Supabase Auth</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;