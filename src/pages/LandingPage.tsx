
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Mail, FileText, Shield, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

const LandingPage = () => {
  const features = [
    {
      icon: <Mail className="w-6 h-6 text-on-lime" />,
      title: 'Recebimento de Correspondências',
      description: 'Receba todas as suas correspondências em nosso endereço e tenha acesso digital imediato.'
    },
    {
      icon: <FileText className="w-6 h-6 text-on-lime" />,
      title: 'Documentos Digitais',
      description: 'IPTU, AVCB e Inscrição Estadual sempre disponíveis para download.'
    },
    {
      icon: <Shield className="w-6 h-6 text-on-lime" />,
      title: 'Endereço Fiscal',
      description: 'Endereço comercial profissional para abertura e alteração de CNPJ.'
    },
    {
      icon: <Phone className="w-6 h-6 text-on-lime" />,
      title: 'Atendimento Telefônico',
      description: 'Equipe especializada para receber fiscalizações e atender chamadas.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Logo size="md" />
            <div className="flex gap-4">
              <Link to="/login">
                <Button variant="outline" className="border-on-lime text-on-dark hover:bg-on-lime hover:text-on-black">
                  Entrar
                </Button>
              </Link>
              <Link to="/planos">
                <Button className="on-button">
                  Contratar Agora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-on-dark mb-6">
            Seu <span className="text-on-lime">endereço comercial</span> completo
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Solução completa para empresas que precisam de endereço fiscal, recebimento de correspondências e atendimento profissional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/planos">
              <Button size="lg" className="on-button text-lg px-8 py-4">
                Ver Planos Disponíveis
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-on-lime text-on-dark hover:bg-on-lime hover:text-on-black text-lg px-8 py-4">
              Saiba Mais
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-on-dark mb-12">
            Por que escolher a ON Office?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="on-card text-center h-full">
                <CardHeader className="pb-4">
                  <div className="mx-auto mb-4 p-3 bg-on-lime/10 rounded-full w-fit">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg text-on-dark">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 on-gradient">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-on-black mb-6">
            Pronto para começar?
          </h2>
          <p className="text-xl text-on-black/80 mb-8">
            Mais de 300 empresas já confiam na ON Office. Seja a próxima!
          </p>
          <Link to="/planos">
            <Button size="lg" className="bg-on-black text-white hover:bg-on-black/90 text-lg px-8 py-4">
              Contratar Agora
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-on-dark text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
          <Logo variant="light" size="md" />
          <p className="text-gray-400 mt-4">
            Copyright © 2025. Todos os direitos reservados ON OFFICE COWORKING– CNPJ: 28.470.683/0001-60. 
            Av. Generalíssimo Deodoro, 1893 – Nazaré. Belém-PA. 
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
