import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';
import { useProducts, type Plano } from '@/hooks/useProducts';
import { formatCurrency } from '@/utils/formatters';

const DynamicPlanSelection = () => {
  const { fetchPlanosAtivos } = useProducts();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlanos = async () => {
      try {
        setLoading(true);
        const planosAtivos = await fetchPlanosAtivos();
        setPlanos(planosAtivos);
      } catch (err) {
        console.error('Erro ao carregar planos:', err);
        setError('Não foi possível carregar os planos disponíveis');
      } finally {
        setLoading(false);
      }
    };

    loadPlanos();
  }, []);


  const getPriceDisplay = (plano: Plano) => {
    const price = formatCurrency(plano.preco_em_centavos);
    
    // Lógica para determinar se é mensal, anual, etc.
    if (plano.nome_plano.toLowerCase().includes('mensal')) {
      return { price, period: '/mês' };
    } else if (plano.nome_plano.toLowerCase().includes('anual') || plano.nome_plano.toLowerCase().includes('ano')) {
      return { 
        price, 
        period: '/ano',
        monthlyEquivalent: formatCurrency(Math.round(plano.preco_em_centavos / 12)) + '/mês'
      };
    }
    return { price, period: '' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando planos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Erro ao carregar planos</h2>
          <p className="text-gray-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (planos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-600 mb-2">Nenhum plano disponível</h2>
          <p className="text-gray-500">Os planos estão sendo atualizados. Tente novamente em breve.</p>
        </div>
      </div>
    );
  }

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
              Nossos serviços de endereço fiscal completo com atendimento profissional
            </p>
          </div>

          <div className={`grid gap-8 max-w-6xl mx-auto ${
            planos.length === 1 ? 'grid-cols-1 max-w-md' :
            planos.length === 2 ? 'md:grid-cols-2 max-w-4xl' :
            'md:grid-cols-3'
          }`}>
            {planos.map((plano) => {
              const priceDisplay = getPriceDisplay(plano);
              
              return (
                <Card key={plano.id} className={`relative ${plano.popular ? 'ring-2 ring-on-lime scale-105' : ''} on-card h-full`}>
                  {plano.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-on-lime text-on-black px-4 py-1 text-sm font-bold">
                        MAIS POPULAR
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl font-bold text-on-dark mb-2">
                      {plano.nome_plano}
                    </CardTitle>
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-center">
                        <span className="text-5xl font-bold text-on-lime">{priceDisplay.price}</span>
                        {priceDisplay.period && (
                          <span className="text-gray-600 ml-1">{priceDisplay.period}</span>
                        )}
                      </div>
                      {priceDisplay.monthlyEquivalent && (
                        <p className="text-sm text-gray-600">ou {priceDisplay.monthlyEquivalent}</p>
                      )}
                    </div>
                    
                    {plano.produtos && (
                      <p className="text-sm text-gray-500 mt-2">{plano.produtos.nome_produto}</p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {plano.descricao && (
                      <p className="text-gray-600 text-sm">{plano.descricao}</p>
                    )}

                    {plano.entregaveis && plano.entregaveis.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-on-dark mb-3">Incluído:</h4>
                        <ul className="space-y-2">
                          {plano.entregaveis.map((entregavel, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="w-5 h-5 text-on-lime mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 text-sm">{entregavel}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Link 
                      to="/cadastro" 
                      state={{ 
                        selectedPlan: plano.nome_plano,
                        selectedPlanData: {
                          id: plano.id,
                          produto_id: plano.produto_id,
                          nome_plano: plano.nome_plano,
                          preco_em_centavos: plano.preco_em_centavos,
                          produtos: plano.produtos
                        }
                      }}
                    >
                      <Button className={`w-full mt-6 ${plano.popular ? 'on-button' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>
                        Contratar {plano.nome_plano}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
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
            Processamos mais de 30 correspondências diárias com total segurança e agilidade
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

export default DynamicPlanSelection;