import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export interface ImportClientData {
  email: string;
  nome_responsavel: string;
  telefone: string;
  produto_nome: string;
  plano_nome: string;
  tipo_pessoa: string;
  ultimo_pagamento: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  cpf_responsavel?: string;
  cnpj?: string;
  razao_social?: string;
  numero_endereco?: string;
  complemento_endereco?: string;
  bairro?: string;
  preco?: number;
  status_contratacao?: string;
  // Legacy field for backward compatibility
  plano_selecionado?: string;
}

export interface ImportResult {
  success: boolean;
  clientData: ImportClientData;
  error?: string;
  credentials?: {
    email: string;
    temporaryPassword: string;
  };
}

export interface ImportStats {
  total: number;
  processed: number;
  success: number;
  failed: number;
  results: ImportResult[];
}

export const useClientBatchImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats>({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    results: []
  });
  const { toast } = useToast();

  const parseExcelFile = (file: File): Promise<ImportClientData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          const parsedData = jsonData.map((row: any) => ({
            email: row.email || row.Email || '',
            nome_responsavel: row.nome_responsavel || row['Nome Responsável'] || '',
            telefone: row.telefone || row.Telefone || '',
            produto_nome: row.produto_nome || row['Produto'] || '',
            plano_nome: row.plano_nome || row['Plano'] || '',
            tipo_pessoa: row.tipo_pessoa || row['Tipo Pessoa'] || '',
            ultimo_pagamento: row.ultimo_pagamento || row['Último Pagamento'] || '',
            endereco: row.endereco || row.Endereço || '',
            cidade: row.cidade || row.Cidade || '',
            estado: row.estado || row.Estado || '',
            cep: row.cep || row.CEP || '',
            cpf_responsavel: row.cpf_responsavel || row['CPF Responsável'] || '',
            cnpj: row.cnpj || row.CNPJ || '',
            razao_social: row.razao_social || row['Razão Social'] || '',
            numero_endereco: row.numero_endereco || row['Número Endereço'] || '',
            complemento_endereco: row.complemento_endereco || row['Complemento Endereço'] || '',
            bairro: row.bairro || row.Bairro || '',
            preco: row.preco || row.Preço || undefined,
            status_contratacao: row.status_contratacao || row['Status Contratação'] || 'ATIVO',
            // Legacy support
            plano_selecionado: row.plano_selecionado || row['Plano Selecionado'] || ''
          }));
          
          resolve(parsedData);
        } catch (error) {
          reject(new Error('Erro ao processar arquivo Excel: ' + (error as Error).message));
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsBinaryString(file);
    });
  };

  const validateClientData = (client: ImportClientData): string[] => {
    const errors: string[] = [];
    
    if (!client.email) errors.push('Email é obrigatório');
    if (!client.nome_responsavel) errors.push('Nome do responsável é obrigatório');
    if (!client.telefone) errors.push('Telefone é obrigatório');
    if (!client.produto_nome && !client.plano_selecionado) errors.push('Produto é obrigatório');
    if (!client.plano_nome && !client.plano_selecionado) errors.push('Plano é obrigatório');
    if (!client.tipo_pessoa) errors.push('Tipo de pessoa é obrigatório');
    if (!client.ultimo_pagamento) errors.push('Último pagamento é obrigatório');
    if (!client.endereco) errors.push('Endereço é obrigatório');
    if (!client.cidade) errors.push('Cidade é obrigatório');
    if (!client.estado) errors.push('Estado é obrigatório');
    if (!client.cep) errors.push('CEP é obrigatório');
    
    // Validações específicas
    if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
      errors.push('Email inválido');
    }
    
    // Legacy validation for old format
    if (client.plano_selecionado && !['1 ANO', '6 MESES', '1 MES'].includes(client.plano_selecionado)) {
      errors.push('Plano deve ser: 1 ANO, 6 MESES ou 1 MES (formato legado)');
    }
    
    if (client.tipo_pessoa && !['fisica', 'juridica'].includes(client.tipo_pessoa)) {
      errors.push('Tipo de pessoa deve ser: fisica ou juridica');
    }
    
    return errors;
  };

  const processClientWithWebhook = async (clientData: ImportClientData): Promise<ImportResult> => {
    try {
      const validationErrors = validateClientData(clientData);
      if (validationErrors.length > 0) {
        return {
          success: false,
          clientData,
          error: validationErrors.join(', ')
        };
      }

      // Preparar dados para o webhook N8N (usar formato legado se disponível)
      const webhookData: any = {
        plano_selecionado: clientData.plano_selecionado || '1 ANO', // Fallback para compatibilidade
        tipo_pessoa: clientData.tipo_pessoa,
        email: clientData.email,
        telefone: clientData.telefone,
        nome_responsavel: clientData.nome_responsavel,
        endereco: clientData.endereco,
        cidade: clientData.cidade,
        estado: clientData.estado,
        cep: clientData.cep,
        status_contratacao: clientData.status_contratacao || 'ATIVO'
      };

      // Adicionar campos opcionais se existirem
      if (clientData.cpf_responsavel) webhookData.cpf_responsavel = clientData.cpf_responsavel;
      if (clientData.cnpj) webhookData.cnpj = clientData.cnpj;
      if (clientData.razao_social) webhookData.razao_social = clientData.razao_social;
      if (clientData.numero_endereco) webhookData.numero_endereco = clientData.numero_endereco;
      if (clientData.complemento_endereco) webhookData.complemento_endereco = clientData.complemento_endereco;
      if (clientData.bairro) webhookData.bairro = clientData.bairro;
      if (clientData.preco) webhookData.preco = clientData.preco;

      // Chamar webhook N8N existente
      const webhookUrl = 'https://sidneyarfe.app.n8n.cloud/webhook/7dd7b139-983a-4cd2-b4ee-224f028b2983';
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        throw new Error(`Erro no webhook: ${response.status} - ${response.statusText}`);
      }

      const webhookResult = await response.text();
      console.log('Webhook result:', webhookResult);

      // Após sucesso do webhook, atualizar campos específicos da importação e adicionar planos
      await updateClientAfterImport(clientData);

      return {
        success: true,
        clientData,
        credentials: {
          email: clientData.email,
          temporaryPassword: 'Enviada por email'
        }
      };

    } catch (error) {
      console.error('Erro ao processar cliente:', error);
      return {
        success: false,
        clientData,
        error: (error as Error).message
      };
    }
  };

  const updateClientAfterImport = async (clientData: ImportClientData) => {
    try {
      // Buscar o contrato recém-criado pelo email
      const { data: contract } = await supabase
        .from('contratacoes_clientes')
        .select('id')
        .eq('email', clientData.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (contract) {
        // Converter data do formato DD/MM/AAAA para YYYY-MM-DD
        let ultimoPagamentoDate = null;
        if (clientData.ultimo_pagamento) {
          const [day, month, year] = clientData.ultimo_pagamento.split('/');
          ultimoPagamentoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Atualizar com último pagamento e calcular próximo vencimento
        const { error } = await supabase
          .from('contratacoes_clientes')
          .update({
            ultimo_pagamento: ultimoPagamentoDate,
            proximo_vencimento: ultimoPagamentoDate ? 
              await calculateNextDueDate(ultimoPagamentoDate, clientData.plano_selecionado || '1 ANO') : null
          })
          .eq('id', contract.id);

        if (error) {
          console.error('Erro ao atualizar cliente após importação:', error);
        }

        // Se temos produto e plano específicos, adicionar à tabela cliente_planos
        if (clientData.produto_nome && clientData.plano_nome) {
          await addClientePlanoFromImport(contract.id, clientData);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar dados pós-importação:', error);
    }
  };

  const addClientePlanoFromImport = async (contractId: string, clientData: ImportClientData) => {
    try {
      // Buscar produto por nome
      const { data: produto } = await supabase
        .from('produtos')
        .select('id')
        .eq('nome_produto', clientData.produto_nome)
        .single();

      if (!produto) {
        console.error('Produto não encontrado:', clientData.produto_nome);
        return;
      }

      // Buscar plano por nome e produto
      const { data: plano } = await supabase
        .from('planos')
        .select('id, periodicidade')
        .eq('nome_plano', clientData.plano_nome)
        .eq('produto_id', produto.id)
        .single();

      if (!plano) {
        console.error('Plano não encontrado:', clientData.plano_nome);
        return;
      }

      // Converter data do último pagamento
      let dataInicio = new Date();
      if (clientData.ultimo_pagamento) {
        const [day, month, year] = clientData.ultimo_pagamento.split('/');
        dataInicio = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Calcular próximo vencimento usando a função do banco
      const { data: proximoVencimento } = await supabase
        .rpc('calcular_vencimento_por_periodicidade', {
          p_data_inicio: dataInicio.toISOString().split('T')[0],
          p_periodicidade: plano.periodicidade
        });

      // Adicionar à tabela cliente_planos
      const { error } = await supabase
        .from('cliente_planos')
        .insert({
          cliente_id: contractId,
          plano_id: plano.id,
          data_inicio: dataInicio.toISOString().split('T')[0],
          proximo_vencimento: proximoVencimento,
          status: 'ativo',
          data_ultimo_pagamento: dataInicio.toISOString().split('T')[0]
        });

      if (error) {
        console.error('Erro ao adicionar plano ao cliente:', error);
      }
    } catch (error) {
      console.error('Erro ao processar plano do cliente:', error);
    }
  };

  const calculateNextDueDate = async (lastPayment: string, plan: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .rpc('calcular_proximo_vencimento', {
          p_data_contratacao: lastPayment,
          p_plano: plan
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao calcular próximo vencimento:', error);
      return null;
    }
  };

  const importClients = async (clients: ImportClientData[]) => {
    setIsImporting(true);
    
    const stats: ImportStats = {
      total: clients.length,
      processed: 0,
      success: 0,
      failed: 0,
      results: []
    };

    setImportStats(stats);

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      
      try {
        const result = await processClientWithWebhook(client);
        
        stats.results.push(result);
        stats.processed++;
        
        if (result.success) {
          stats.success++;
        } else {
          stats.failed++;
        }
        
        setImportStats({ ...stats });
        
        // Delay entre processamentos para não sobrecarregar o webhook
        if (i < clients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
        
      } catch (error) {
        stats.results.push({
          success: false,
          clientData: client,
          error: (error as Error).message
        });
        stats.processed++;
        stats.failed++;
        setImportStats({ ...stats });
      }
    }

    setIsImporting(false);
    
    toast({
      title: "Importação Concluída",
      description: `${stats.success} clientes importados com sucesso, ${stats.failed} falhas`,
      variant: stats.failed > 0 ? "destructive" : "default"
    });
  };

  const downloadTemplate = () => {
    const templateData = [{
      email: 'cliente@exemplo.com',
      nome_responsavel: 'João Silva',
      telefone: '(11) 99999-9999',
      produto_nome: 'Endereço Fiscal',
      plano_nome: 'Plano Básico',
      tipo_pessoa: 'fisica',
      ultimo_pagamento: '15/01/2024',
      endereco: 'Rua das Flores, 123',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567',
      cpf_responsavel: '123.456.789-00',
      cnpj: '',
      razao_social: '',
      numero_endereco: '123',
      complemento_endereco: 'Apt 45',
      bairro: 'Centro',
      preco: 1200,
      status_contratacao: 'ATIVO',
      // Legacy compatibility
      plano_selecionado: '1 ANO'
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    
    // Ajustar largura das colunas
    const colWidths = [
      { wch: 25 }, // email
      { wch: 20 }, // nome_responsavel
      { wch: 15 }, // telefone
      { wch: 18 }, // produto_nome
      { wch: 15 }, // plano_nome
      { wch: 12 }, // tipo_pessoa
      { wch: 15 }, // ultimo_pagamento
      { wch: 30 }, // endereco
      { wch: 15 }, // cidade
      { wch: 8 },  // estado
      { wch: 12 }, // cep
      { wch: 18 }, // cpf_responsavel
      { wch: 18 }, // cnpj
      { wch: 25 }, // razao_social
      { wch: 12 }, // numero_endereco
      { wch: 20 }, // complemento_endereco
      { wch: 15 }, // bairro
      { wch: 10 }, // preco
      { wch: 18 }, // status_contratacao
      { wch: 15 }  // plano_selecionado (legacy)
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'template_importacao_clientes.xlsx');
  };

  const resetStats = () => {
    setImportStats({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      results: []
    });
  };

  return {
    isImporting,
    importStats,
    parseExcelFile,
    importClients,
    downloadTemplate,
    resetStats,
    validateClientData
  };
};