import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export interface ImportClientData {
  email: string;
  nome_responsavel: string;
  telefone: string;
  plano_selecionado: string;
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
            plano_selecionado: row.plano_selecionado || row['Plano Selecionado'] || '',
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
            status_contratacao: row.status_contratacao || row['Status Contratação'] || 'ATIVO'
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
    if (!client.plano_selecionado) errors.push('Plano selecionado é obrigatório');
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
    
    if (client.plano_selecionado && !['1 ANO', '6 MESES', '1 MES'].includes(client.plano_selecionado)) {
      errors.push('Plano deve ser: 1 ANO, 6 MESES ou 1 MES');
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

      // Preparar dados para o webhook N8N (mesmo formato do useClientManagement)
      const webhookData: any = {
        plano_selecionado: clientData.plano_selecionado,
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

      // Após sucesso do webhook, atualizar campos específicos da importação
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
              await calculateNextDueDate(ultimoPagamentoDate, clientData.plano_selecionado) : null
          })
          .eq('id', contract.id);

        if (error) {
          console.error('Erro ao atualizar cliente após importação:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar dados pós-importação:', error);
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
      plano_selecionado: '1 ANO',
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
      status_contratacao: 'ATIVO'
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    
    // Ajustar largura das colunas
    const colWidths = [
      { wch: 25 }, // email
      { wch: 20 }, // nome_responsavel
      { wch: 15 }, // telefone
      { wch: 15 }, // plano_selecionado
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
      { wch: 18 }  // status_contratacao
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