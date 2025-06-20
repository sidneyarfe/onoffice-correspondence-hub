
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';

const AguardandoAssinatura = () => {
  const [status, setStatus] = useState('Processando sua contratação...');
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const nome = location.state?.nome;

  useEffect(() => {
    if (!email) {
      setStatus('Dados de contratação não encontrados. Redirecionando...');
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    console.log('Iniciando polling para o email:', email);

    // Lógica de Polling a cada 3 segundos para buscar a contratação pelo email
    const intervalId = setInterval(async () => {
      console.log(`Verificando contratação para o email: ${email}`);
      
      try {
        // Buscar contratação pelo email
        const { data: contratacao, error } = await supabase
          .from('contratacoes_clientes')
          .select('id, zapsign_signing_url, status_contratacao')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('Erro ao buscar contratação:', error);
          setStatus('Processando sua contratação...');
          return;
        }

        if (contratacao) {
          console.log('Contratação encontrada:', contratacao.id);
          
          // Se a URL de assinatura estiver disponível, redireciona
          if (contratacao.zapsign_signing_url) {
            console.log(`Link de assinatura encontrado. Redirecionando...`);
            setStatus('Contrato pronto! Redirecionando para assinatura...');
            clearInterval(intervalId);
            
            // Salva o ID da contratação no localStorage antes de redirecionar
            localStorage.setItem('onofficeContratacaoId', contratacao.id);
            
            // Aguardar um momento antes de redirecionar
            setTimeout(() => {
              window.location.href = contratacao.zapsign_signing_url;
            }, 1500);
          } else {
            setStatus('Contrato sendo preparado...');
          }
        } else {
          setStatus('Aguardando processamento pelo n8n...');
        }

      } catch (err) {
        console.error('Erro na consulta:', err);
        setStatus('Processando dados. Aguarde...');
      }

    }, 3000); // Verifica a cada 3 segundos

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);

  }, [email, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-6">
      <Logo size="lg" />
      <div className="animate-spin h-8 w-8 border-4 border-on-lime border-t-transparent rounded-full"></div>
      <p className="text-xl text-gray-700">{status}</p>
      {nome && (
        <p className="text-lg text-gray-600">Olá, {nome}!</p>
      )}
      <p className="text-sm text-gray-500 text-center max-w-md">
        Estamos processando sua contratação. Você será redirecionado automaticamente quando o contrato estiver pronto para assinatura.
      </p>
    </div>
  );
};

export default AguardandoAssinatura;
