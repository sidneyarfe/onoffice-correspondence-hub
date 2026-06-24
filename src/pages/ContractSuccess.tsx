
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, CreditCard, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

const ContractSuccess = () => {
  return (
    <div className="min-h-screen on-mesh bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-6">
            <Logo size="md" variant="light" />
          </div>
        </div>
      </header>

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <Card className="on-card text-center mb-8">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-on-lime" />
              </div>
              <CardTitle className="text-3xl text-foreground mb-2">
                Parabéns! 🎉
              </CardTitle>
              <p className="text-xl text-muted-foreground">
                Sua contratação foi finalizada com sucesso!
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-on-lime/10 border border-on-lime/30 rounded-lg p-4">
                  <h3 className="font-semibold text-on-lime mb-2">
                    Bem-vindo à ON Office!
                  </h3>
                  <p className="text-on-lime text-sm">
                    Sua conta foi criada e já está ativa. Você receberá suas credenciais de acesso por email em alguns minutos.
                  </p>
                </div>

                {/* Next Steps */}
                <div className="grid md:grid-cols-3 gap-4 mt-8">
                  <div className="text-center p-4 bg-white/[0.04] rounded-lg">
                    <Mail className="w-8 h-8 text-on-lime mx-auto mb-2" />
                    <h4 className="font-semibold text-foreground mb-1">Verifique seu email</h4>
                    <p className="text-sm text-muted-foreground">
                      Enviaremos suas credenciais de acesso
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white/[0.04] rounded-lg">
                    <FileText className="w-8 h-8 text-on-lime mx-auto mb-2" />
                    <h4 className="font-semibold text-foreground mb-1">Documentos</h4>
                    <p className="text-sm text-muted-foreground">
                      Acesse seus documentos fiscais
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white/[0.04] rounded-lg">
                    <CreditCard className="w-8 h-8 text-on-lime mx-auto mb-2" />
                    <h4 className="font-semibold text-foreground mb-1">Pagamento</h4>
                    <p className="text-sm text-muted-foreground">
                      Configurado e funcionando
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <Link to="/login">
                    <Button className="w-full on-button text-lg h-12">
                      Acessar Minha Conta
                    </Button>
                  </Link>
                  
                  <p className="text-sm text-muted-foreground mt-4">
                    Se você não receber o email em até 15 minutos, verifique sua caixa de spam ou entre em contato conosco.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support Information */}
          <Card className="on-card">
            <CardHeader>
              <CardTitle className="text-center text-foreground">
                Precisa de ajuda?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Nossa equipe está sempre disponível para ajudar você.
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> contato@onoffice.com.br</p>
                <p><strong>WhatsApp:</strong> (11) 99999-9999</p>
                <p><strong>Horário:</strong> Segunda a Sexta, 9h às 18h</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContractSuccess;
