
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de planos para valores mensais
const planPrices: { [key: string]: number } = {
  '1 MES': 129.00,
  '1 ANO': 99.00,
  '2 ANOS': 69.00,
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando busca de dados financeiros...');

    // Cliente Admin do Supabase para ter acesso total
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!MP_ACCESS_TOKEN) {
      throw new Error('Chave do Mercado Pago não encontrada nos secrets.');
    }

    // 1. Buscar transações reais do Mercado Pago
    console.log('Buscando transações do Mercado Pago...');
    let realTransactions = [];
    
    try {
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=50', {
        headers: { 
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (mpResponse.ok) {
        const mpData = await mpResponse.json();
        realTransactions = mpData.results || [];
        console.log(`Encontradas ${realTransactions.length} transações do Mercado Pago`);
      } else {
        console.log('Erro ao buscar dados do Mercado Pago:', mpResponse.status);
      }
    } catch (mpError) {
      console.log('Erro na API do Mercado Pago:', mpError.message);
      // Continua mesmo se falhar, usando apenas dados do Supabase
    }

    // 2. Buscar TODOS os clientes do Supabase
    console.log('Buscando clientes do Supabase...');
    const { data: allClients, error: clientsError } = await supabaseAdmin
      .from('contratacoes_clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientsError) {
      console.error('Erro ao buscar clientes:', clientsError);
      throw clientsError;
    }

    console.log(`Encontrados ${allClients?.length || 0} clientes no Supabase`);

    // 3. Calcular métricas consolidadas
    let monthlyRevenue = 0;
    let totalPaidAmount = 0;
    let overdueAmount = 0;
    const activeClientsCount = allClients?.filter(c => c.status_contratacao === 'ATIVO').length || 0;

    // Calcular receita mensal recorrente
    allClients?.forEach(client => {
      if (client.status_contratacao === 'ATIVO') {
        const planPrice = planPrices[client.plano_selecionado] || 99.00;
        monthlyRevenue += planPrice;
      }
    });

    // Calcular valores dos pagamentos reais
    realTransactions.forEach(transaction => {
      if (transaction.status === 'approved') {
        totalPaidAmount += transaction.transaction_amount;
      }
    });

    // Simular alguns clientes em atraso para demonstração
    const overdueClients = allClients?.filter(c => {
      const createdDate = new Date(c.created_at);
      const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return c.status_contratacao === 'ATIVO' && daysSinceCreation > 30;
    }) || [];

    overdueClients.forEach(client => {
      const planPrice = planPrices[client.plano_selecionado] || 99.00;
      overdueAmount += planPrice;
    });

    // 4. Consolidar lista de transações (reais + simuladas)
    const consolidatedTransactions = [];

    // Adicionar transações reais do Mercado Pago
    realTransactions.forEach(transaction => {
      const client = allClients?.find(c => c.mercadopago_payment_id === transaction.id.toString());
      consolidatedTransactions.push({
        id: transaction.id,
        client: client?.nome_responsavel || client?.razao_social || 'Cliente não identificado',
        description: transaction.description || `Pagamento - ${client?.plano_selecionado || 'Plano'}`,
        date: transaction.date_approved || transaction.date_created,
        amount: transaction.transaction_amount,
        status: transaction.status === 'approved' ? 'paid' : 
                transaction.status === 'pending' ? 'pending' : 'overdue',
        type: 'real'
      });
    });

    // Adicionar entradas simuladas para clientes ativos sem transação real
    allClients?.forEach(client => {
      const hasRealTransaction = realTransactions.some(rt => rt.id.toString() === client.mercadopago_payment_id);
      
      if (client.status_contratacao === 'ATIVO' && !hasRealTransaction) {
        const planPrice = planPrices[client.plano_selecionado] || 99.00;
        const createdDate = new Date(client.created_at);
        const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        
        consolidatedTransactions.push({
          id: `sim_${client.id}`,
          client: client.nome_responsavel || client.razao_social,
          description: `${client.plano_selecionado} - Mensalidade`,
          date: client.mercadopago_paid_at || client.created_at,
          amount: planPrice,
          status: daysSinceCreation > 30 ? 'overdue' : 'paid',
          type: 'simulated'
        });
      }
    });

    // Ordenar por data (mais recentes primeiro)
    consolidatedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const responseData = {
      success: true,
      financialStats: {
        totalRevenue: totalPaidAmount,
        monthlyRevenue,
        overdueAmount,
        activeClientsCount,
        totalClients: allClients?.length || 0,
        paidTransactions: realTransactions.filter(t => t.status === 'approved').length,
        averageTicket: activeClientsCount > 0 ? monthlyRevenue / activeClientsCount : 0
      },
      transactions: consolidatedTransactions.slice(0, 50),
      overdueClients: overdueClients.map(client => ({
        id: client.id,
        name: client.nome_responsavel || client.razao_social,
        email: client.email,
        plan: client.plano_selecionado,
        amount: planPrices[client.plano_selecionado] || 99.00,
        daysOverdue: Math.floor((Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24)) - 30
      })).slice(0, 10)
    };

    console.log('Dados financeiros processados com sucesso');
    
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro na função get-financial-overview:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Verifique os logs da função para mais detalhes'
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
