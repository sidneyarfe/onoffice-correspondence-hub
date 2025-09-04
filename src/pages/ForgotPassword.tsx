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

    console.log('🔄 Iniciando processo de recuperação de senha para:', email);
    console.log('🔗 URL de redirecionamento:', `${window.location.origin}/reset-password`);

    try {
      // Primeiro, verificar se o usuário existe no auth.users
      console.log('🔍 Verificando se usuário existe no auth.users...');
      
      // Para admins, primeiro verificar se o usuário existe, se não, criar automaticamente
      const isAdminEmail = email === 'onoffice1893@gmail.com' || 
                          email === 'onoffice1894@gmail.com' ||
                          email === 'contato@onofficebelem.com.br' ||
                          email.includes('@onoffice.com');

      let createResult = null;
      if (isAdminEmail) {
        console.log('📧 Email admin detectado, verificando/criando usuário...');
        try {
          // Tentar criar o usuário admin automaticamente
          const { data: createData, error: createError } = await supabase.functions.invoke('create-admin-auth-user', {
            body: {
              email: email,
              password: email.includes('1893') ? 'OnOffice2024!' : 'OnOffice2025!',
              full_name: email.includes('1893') ? 'OnOffice Admin Principal' : 'OnOffice Admin Secundário'
            }
          });

          createResult = { data: createData, error: createError };
          
          if (createError) {
            console.warn('⚠️ Aviso ao criar usuário admin:', createError);
            // Continuar com o processo mesmo se houver erro na criação
          } else {
            console.log('✅ Usuário admin criado/atualizado:', createData);
          }
        } catch (error: any) {
          console.warn('⚠️ Erro ao criar usuário admin (continuando):', error);
          // Não falhar o processo, apenas logar
        }
      }

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      console.log('📧 Resposta do Supabase:', { data, error });

      if (error) {
        console.error('❌ Erro retornado pelo Supabase:', error);
        
        // Se for erro de usuário não encontrado para admin, tentar corrigir automaticamente
        if (error.message?.includes('User not found') || 
            error.message?.includes('email not confirmed') ||
            error.message?.includes('Invalid email')) {
          
          if (isAdminEmail && createResult?.data?.success) {
            console.log('🔄 Usuário admin foi criado, tentando recuperação novamente...');
            
            // Aguardar um pouco para o usuário ser processado
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Tentar novamente a recuperação de senha
            const { data: retryData, error: retryError } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/reset-password`,
            });
            
            if (!retryError) {
              console.log('✅ Recuperação de senha funcionou após criação do usuário');
              setEmailSent(true);
              toast({
                title: "Email enviado!",
                description: "Usuário admin criado e email de recuperação enviado com sucesso!",
              });
              return;
            } else {
              console.error('❌ Falha na tentativa de recuperação após criação:', retryError);
            }
          }
          
          if (isAdminEmail) {
            console.log('🔧 Email admin não pôde ser corrigido automaticamente');
            toast({
              title: "Usuário Admin não encontrado",
              description: "Este email admin não está no sistema. Verifique se o email está correto ou entre em contato com o suporte técnico.",
              variant: "destructive",
            });
            return;
          }
        }
        
        throw error;
      }

      console.log('✅ Email de recuperação enviado com sucesso');
      setEmailSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      
    } catch (error: any) {
      console.error('🚨 Erro completo ao enviar email de reset:', {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error
      });
      
      let errorMessage = "Não foi possível enviar o email de recuperação.";
      
      if (error.message?.includes('rate limit')) {
        errorMessage = "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = "Email inválido. Verifique se o endereço está correto.";
      } else if (error.message?.includes('User not found')) {
        errorMessage = "Email não encontrado em nossa base de dados.";
      } else if (error.message?.includes('email not confirmed')) {
        errorMessage = "Email não confirmado no sistema.";
      } else if (error.message) {
        errorMessage = error.message;
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Logo size="md" />
          </div>

          <Card className="on-card">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-on-dark">Email Enviado</CardTitle>
              <CardDescription>
                Enviamos um link de recuperação para <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-sm text-gray-600 space-y-2">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Logo size="md" />
          <p className="mt-4 text-gray-600">Recupere sua senha</p>
        </div>

        <Card className="on-card">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-on-dark">Esqueceu sua senha?</CardTitle>
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

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>Importante:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>O link de recuperação expira em 1 hora</li>
                <li>Funciona tanto para contas de cliente quanto admin</li>
                <li>Se não receber o email, verifique a pasta de spam</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;