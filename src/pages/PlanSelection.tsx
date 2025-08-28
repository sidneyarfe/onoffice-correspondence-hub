
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

const PlanSelection = () => {
  const plans = [
    {
      name: 'MENSAL',
      price: 'R$ 129',
      period: '/mês',
      setupFee: 'R$ 250 (Taxa de Adesão)',
      popular: false,
      features: [
        'Endereço Comercial para divulgação',
        'Endereço Fiscal para abertura/alteração de CNPJ',
        'Recebimento de Correspondências',
        'Atendimento Telefônico',
        'Inscrição Estadual',
        'Equipe para receber fiscalizações'
      ],
      bonuses: []
    },
    {
      name: '1 ANO',
      price: 'R$ 99',
      period: '/mês',
      annualPrice: 'R$ 995/ano à vista',
      popular: true,
      features: [
        'Endereço Comercial para divulgação',
        'Endereço Fiscal para abertura/alteração de CNPJ',
        'Recebimento de Correspondências',
        'Atendimento Telefônico',
        'Inscrição Estadual',
        'Equipe para receber fiscalizações'
      ],
      bonuses: [
        '5% de desconto em Salas de Reunião',
        '2h/mês em Salas de Reunião'
      ]
    },
    {
      name: '2 ANOS',
      price: 'R$ 69',
      period: '/mês',
      annualPrice: 'R$ 1.656/ano à vista',
      popular: false,
      features: [
        'Endereço Comercial para divulgação',
        'Endereço Fiscal para abertura/alteração de CNPJ',
        'Recebimento de Correspondências',
        'Atendimento Telefônico',
        'Inscrição Estadual',
        'Equipe para receber fiscalizações'
      ],
      bonuses: [
        '5% de desconto em Salas de Reunião',
        '2h/mês em Salas de Reunião',
        '1h de Consultoria de Marketing Digital'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/">
              <Logo size="md" />
            </Link>
            <Link to="/login">
              <Button variant="outline" className="border-on-lime text-on-dark hover:bg-on-lime hover:text-on-black">
                Já sou cliente
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Plans Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-on-dark mb-4">
              Escolha o plano ideal para sua empresa
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Todos os planos incluem endereço fiscal completo e atendimento profissional
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'ring-2 ring-on-lime scale-105' : ''} on-card h-full`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-on-lime text-on-black px-4 py-1 rounded-full text-sm font-bold">
                      MAIS POPULAR
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold text-on-dark mb-2">
                    Plano {plan.name}
                  </CardTitle>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold text-on-lime">{plan.price}</span>
                      <span className="text-gray-600 ml-1">{plan.period}</span>
                    </div>
                    {plan.annualPrice && (
                      <p className="text-sm text-gray-600">ou {plan.annualPrice}</p>
                    )}
                    {plan.setupFee && (
                      <p className="text-sm text-red-600 font-medium">+ {plan.setupFee}</p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-on-dark mb-3">Incluído:</h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-on-lime mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.bonuses.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-on-lime mb-3">Bônus:</h4>
                      <ul className="space-y-2">
                        {plan.bonuses.map((bonus, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-on-lime mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 text-sm font-medium">{bonus}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link to="/cadastro" state={{ selectedPlan: plan.name }}>
                    <Button className={`w-full mt-6 ${plan.popular ? 'on-button' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>
                      Contratar {plan.name}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-on-dark mb-4">
            Mais de 300 empresas já confiam na ON Office
          </h2>
          <p className="text-gray-600 mb-8">
            Processamos mais de 2 correspondências diárias com total segurança e agilidade
          </p>
          <div className="flex justify-center gap-8 text-4xl font-bold text-on-lime">
            <div className="text-center">
              <div>+300</div>
              <div className="text-sm text-gray-600 font-normal">Clientes Ativos</div>
            </div>
            <div className="text-center">
              <div>+30</div>
              <div className="text-sm text-gray-600 font-normal">Correspondências/dia</div>
            </div>
            <div className="text-center">
              <div>99%</div>
              <div className="text-sm text-gray-600 font-normal">Satisfação</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PlanSelection;
