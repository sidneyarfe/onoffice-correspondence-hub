import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { criarClienteInterno, type ClienteItem, type StatusContratacao } from '@/utils/criarClienteInterno';
import { precoModalidadeCentavos } from '@/utils/avulso';

// DTO de importação alinhado ao modelo atual: o cliente contrata um **produto** através de uma
// **oferta** (resolvidos no catálogo `produtos`/`planos`). Sem campos de preço/método na planilha —
// preço, periodicidade e tipo (assinatura/avulso) vêm da oferta cadastrada.
export interface ImportClientData {
  nome_responsavel: string;
  email: string;
  telefone: string;
  produto: string; // nome do produto no catálogo (opcional)
  oferta: string; // nome da oferta/plano no catálogo (opcional)
  tipo_pessoa: string;
  status_contratacao: string; // status do cliente (funil)
  ultimo_pagamento: string;
  proximo_vencimento: string;
  cpf_responsavel?: string;
  razao_social?: string;
  cnpj?: string;
  endereco?: string;
  numero_endereco?: string;
  complemento_endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
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

  // Controls for pause/cancel
  const [isPaused, setIsPaused] = useState(false);
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);

  const pauseImport = () => {
    pauseRef.current = true;
    setIsPaused(true);
  };
  const resumeImport = () => {
    pauseRef.current = false;
    setIsPaused(false);
  };
  const cancelImport = () => {
    cancelRef.current = true;
  };
  // Helpers: convert Excel serial/date to 'YYYY-MM-DD HH:MM:SS'
  const excelSerialToDate = (serial: number): Date => {
    // Excel serial dates are days since 1899-12-30
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400; // seconds
    const fractionalDay = serial - Math.floor(serial);
    const totalSeconds = Math.round(utcValue + fractionalDay * 86400);
    return new Date(totalSeconds * 1000);
  };

  const formatDateTime = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const parseExcelDate = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') {
      return formatDateTime(excelSerialToDate(value));
    }
    if (value instanceof Date) {
      return formatDateTime(value);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // If numeric string (e.g. "45811.78"), treat as Excel serial
      if (/^\d+(\.\d+)?$/.test(trimmed)) {
        return formatDateTime(excelSerialToDate(parseFloat(trimmed)));
      }
      // Normalize common ISO-like strings: '2025-01-01T10:30:00Z' -> '2025-01-01 10:30:00'
      return trimmed.replace('T', ' ').replace('Z', '');
    }
    return '';
  };

  const getExcelHeaders = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const headers = (rows[0] || []).map((h) => String(h));
          resolve(headers);
        } catch (err) {
          reject(new Error('Erro ao ler cabeçalhos da planilha'));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsBinaryString(file);
    });
  };

  const parseExcelFile = (file: File, columnMap?: Record<string, string>): Promise<ImportClientData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          const getVal = (row: any, key: string, aliases: string[] = []) => {
            const mapped = columnMap?.[key];
            const candidates = [mapped, key, ...aliases].filter(Boolean) as string[];
            for (const k of candidates) {
              const v = row[k as any];
              if (v !== undefined && v !== null && v !== '') {
                // Para campos de documento (CPF, CNPJ, CEP), sempre converter para string
                const docFields = ['cpf_responsavel', 'cnpj', 'cep', 'telefone'];
                if (docFields.includes(key) && typeof v === 'number') {
                  return v.toString();
                }
                return v;
              }
            }
            return '';
          };

          // Aceita os nomes novos (`produto`/`oferta`) e os legados como aliases, p/ planilhas antigas.
          const parsedData = jsonData.map((row: any) => ({
            nome_responsavel: getVal(row, 'nome_responsavel'),
            email: getVal(row, 'email'),
            telefone: getVal(row, 'telefone'),
            produto: getVal(row, 'produto', ['produto_selecionado', 'produto_nome']),
            oferta: getVal(row, 'oferta', ['plano_selecionado', 'plano', 'oferta_nome']),
            tipo_pessoa: getVal(row, 'tipo_pessoa'),
            status_contratacao: getVal(row, 'status_contratacao') || 'ATIVO',
            ultimo_pagamento: parseExcelDate(getVal(row, 'ultimo_pagamento')),
            proximo_vencimento: parseExcelDate(getVal(row, 'proximo_vencimento')),
            cpf_responsavel: getVal(row, 'cpf_responsavel'),
            razao_social: getVal(row, 'razao_social'),
            cnpj: getVal(row, 'cnpj'),
            endereco: getVal(row, 'endereco'),
            numero_endereco: getVal(row, 'numero_endereco'),
            complemento_endereco: getVal(row, 'complemento_endereco'),
            bairro: getVal(row, 'bairro'),
            cidade: getVal(row, 'cidade'),
            estado: getVal(row, 'estado'),
            cep: getVal(row, 'cep'),
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
    if (!client.tipo_pessoa) errors.push('Tipo de pessoa é obrigatório');
    // Produto/oferta são opcionais — só se a oferta for informada o produto passa a ser exigido.
    if (client.oferta && !client.produto) {
      errors.push('Informe também o produto da oferta');
    }
    
    // Validações leves
    if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
      errors.push('Email inválido');
    }
    const tipo = (client.tipo_pessoa || '').toLowerCase();
    if (tipo && !['fisica', 'juridica', 'pf', 'pj'].includes(tipo)) {
      errors.push('Tipo de pessoa deve ser: fisica/juridica (ou pf/pj)');
    }
    
    return errors;
  };

  // Helpers para sanitização
  const digitsOnly = (s?: string | number) => {
    if (s === null || s === undefined) return '';
    const str = s.toString();
    return str.replace(/\D/g, '');
  };

  const normalizeTipoPessoa = (v?: string) => {
    const s = (v || '').toLowerCase();
    if (s === 'pf' || s === 'fisica') return 'fisica';
    if (s === 'pj' || s === 'juridica') return 'juridica';
    return s || 'fisica';
  };

  // ----------------------------------------------------------------------------
  // Catálogo (produtos + planos) — resolve "produto/plano" da planilha por NOME.
  // ----------------------------------------------------------------------------
  interface CatalogoPlano {
    plano_id: string;
    produto_id: string;
    plano_nome: string;
    produto_nome: string;
    tipo: 'assinatura' | 'avulso';
    preco_centavos: number;
    periodicidade: string | null;
    unidade: string | null;
  }

  const norm = (s?: string | null) => (s || '').trim().toLowerCase();

  const carregarCatalogo = async (): Promise<CatalogoPlano[]> => {
    const { data, error } = await supabase
      .from('planos')
      .select('id, produto_id, nome_plano, preco_em_centavos, periodicidade, unidade, produtos:produto_id(nome_produto, tipo)')
      .eq('ativo', true);
    if (error) throw new Error(`Falha ao carregar catálogo de planos: ${error.message}`);
    type PlanoRow = {
      id: string;
      produto_id: string;
      nome_plano: string;
      preco_em_centavos: number | null;
      periodicidade: string | null;
      unidade: string | null;
      produtos: { nome_produto?: string; tipo?: string } | null;
    };
    return ((data ?? []) as PlanoRow[]).map((p) => ({
      plano_id: p.id,
      produto_id: p.produto_id,
      plano_nome: p.nome_plano,
      produto_nome: p.produtos?.nome_produto ?? '',
      tipo: p.produtos?.tipo === 'avulso' ? 'avulso' : 'assinatura',
      preco_centavos: p.preco_em_centavos ?? 0,
      periodicidade: p.periodicidade ?? null,
      unidade: p.unidade ?? null,
    }));
  };

  /**
   * Casa a linha da planilha com uma OFERTA do catálogo (por nome da oferta + produto).
   * Estrito: nunca "chuta" um match — em caso de ambiguidade retorna erro claro, evitando
   * vincular o cliente à oferta errada.
   */
  const resolverOferta = (
    catalogo: CatalogoPlano[],
    client: ImportClientData,
  ): { oferta: CatalogoPlano | null; erro?: string } => {
    const oferta = norm(client.oferta);
    const produto = norm(client.produto);
    const porOferta = catalogo.filter((c) => norm(c.plano_nome) === oferta);
    if (porOferta.length === 0) {
      return { oferta: null, erro: `Oferta "${client.oferta}" não encontrada no catálogo.` };
    }
    if (produto) {
      const doProduto = porOferta.filter((c) => norm(c.produto_nome) === produto);
      if (doProduto.length === 1) return { oferta: doProduto[0] };
      if (doProduto.length === 0) {
        return { oferta: null, erro: `Oferta "${client.oferta}" não pertence ao produto "${client.produto}".` };
      }
      return { oferta: null, erro: `Oferta "${client.oferta}" duplicada no produto "${client.produto}" no catálogo.` };
    }
    if (porOferta.length > 1) {
      return { oferta: null, erro: `Oferta "${client.oferta}" existe em mais de um produto — preencha a coluna "produto" para desambiguar.` };
    }
    return { oferta: porOferta[0] };
  };

  const statusValidos: StatusContratacao[] = [
    'INICIADO', 'CONTRATO_ENVIADO', 'CONTRATO_ASSINADO', 'PAGAMENTO_PENDENTE',
    'PAGAMENTO_CONFIRMADO', 'ATIVO', 'SUSPENSO', 'CANCELADO',
  ];
  const normalizarStatus = (s?: string): StatusContratacao => {
    const up = (s || '').trim().toUpperCase() as StatusContratacao;
    return statusValidos.includes(up) ? up : 'ATIVO';
  };
  // 'YYYY-MM-DD HH:MM:SS' → 'YYYY-MM-DD' (colunas `date` do Postgres)
  const apenasData = (s?: string) => (s ? s.split(' ')[0] || null : null);

  // ----------------------------------------------------------------------------
  // Criação 100% interna por linha (sem n8n) — reusa `criarClienteInterno`.
  // ----------------------------------------------------------------------------
  const processClientInternally = async (
    clientData: ImportClientData,
    catalogo: CatalogoPlano[],
    provisionarAcesso: boolean,
  ): Promise<ImportResult> => {
    try {
      const validationErrors = validateClientData(clientData);
      if (validationErrors.length > 0) {
        return { success: false, clientData, error: validationErrors.join(', ') };
      }

      // Produto/oferta é opcional. Só resolve quando a planilha informa uma oferta — e aí
      // ela precisa existir (sem ambiguidade) no catálogo.
      const querOferta = !!(clientData.oferta && clientData.oferta.trim());
      const oferta = querOferta ? resolverOferta(catalogo, clientData) : { oferta: null };
      if (querOferta && !oferta.oferta) {
        return {
          success: false,
          clientData,
          error: `${oferta.erro} Cadastre o produto/oferta no catálogo antes de importar (ou deixe a oferta em branco).`,
        };
      }

      // Monta o item contratado conforme o tipo do produto (assinatura recorrente × avulso).
      const itens: ClienteItem[] = [];
      const cat = oferta.oferta;
      if (cat) {
        if (cat.tipo === 'avulso') {
          const modalidade = cat.unidade || 'hora';
          itens.push({
            tipo: 'avulso',
            produto_id: cat.produto_id,
            plano_id: cat.plano_id,
            produto_nome: cat.produto_nome,
            oferta_nome: cat.plano_nome,
            modalidade,
            quantidade: 1,
            preco_unit_centavos: precoModalidadeCentavos(cat.preco_centavos, modalidade),
          });
        } else {
          itens.push({
            tipo: 'assinatura',
            produto_id: cat.produto_id,
            plano_id: cat.plano_id,
            produto_nome: cat.produto_nome,
            oferta_nome: cat.plano_nome,
            periodicidade: cat.periodicidade,
            preco_centavos: cat.preco_centavos,
            data_inicio: apenasData(clientData.ultimo_pagamento) || undefined,
            proximo_vencimento: apenasData(clientData.proximo_vencimento) || undefined,
            status: 'ativo',
          });
        }
      }

      const result = await criarClienteInterno({
        tipo_pessoa: normalizeTipoPessoa(clientData.tipo_pessoa) as 'fisica' | 'juridica',
        nome_responsavel: clientData.nome_responsavel,
        email: clientData.email,
        telefone: digitsOnly(clientData.telefone) || null,
        cpf_responsavel: digitsOnly(clientData.cpf_responsavel) || null,
        razao_social: clientData.razao_social || null,
        cnpj: digitsOnly(clientData.cnpj) || null,
        endereco: clientData.endereco || null,
        numero_endereco: clientData.numero_endereco || null,
        complemento_endereco: clientData.complemento_endereco || null,
        bairro: clientData.bairro || null,
        cidade: clientData.cidade || null,
        estado: clientData.estado || null,
        cep: digitsOnly(clientData.cep) || null,
        status_contratacao: normalizarStatus(clientData.status_contratacao),
        itens,
        provisionarAcesso,
      });

      return {
        success: true,
        clientData,
        error: result.provisionWarning,
        credentials: result.temporaryPassword
          ? { email: result.email, temporaryPassword: result.temporaryPassword }
          : undefined,
      };
    } catch (error) {
      console.error('Erro ao processar cliente:', error);
      return { success: false, clientData, error: (error as Error).message };
    }
  };

  const importClients = async (
    clients: ImportClientData[],
    options?: { provisionarAcesso?: boolean },
  ) => {
    if (clients.length === 0) return;
    const provisionarAcesso = options?.provisionarAcesso !== false;

    // Carrega o catálogo uma única vez para resolver produto/plano por nome.
    let catalogo: CatalogoPlano[];
    try {
      catalogo = await carregarCatalogo();
    } catch (error) {
      toast({
        title: 'Erro ao carregar catálogo',
        description: (error as Error).message,
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setImportStats({
      total: clients.length,
      processed: 0,
      success: 0,
      failed: 0,
      results: []
    });

    const results: ImportResult[] = [];

    for (let i = 0; i < clients.length; i++) {
      // Check for pause
      while (pauseRef.current && !cancelRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check for cancel
      if (cancelRef.current) {
        console.log('Import cancelled by user');
        break;
      }

      const client = clients[i];
      console.log(`Processing client ${i + 1}/${clients.length}: ${client.email}`);

      try {
        const result = await processClientInternally(client, catalogo, provisionarAcesso);
        results.push(result);

        setImportStats(prev => ({
          ...prev,
          processed: i + 1,
          success: prev.success + (result.success ? 1 : 0),
          failed: prev.failed + (result.success ? 0 : 1),
          results: [...prev.results, result]
        }));

        if (result.success) {
          console.log(`✅ Client ${client.email} imported successfully`);
        } else {
          console.error(`❌ Client ${client.email} failed: ${result.error}`);
        }

      } catch (error) {
        console.error(`Error processing client ${client.email}:`, error);
        const failResult: ImportResult = {
          success: false,
          clientData: client,
          error: (error as Error).message
        };
        results.push(failResult);

        setImportStats(prev => ({
          ...prev,
          processed: i + 1,
          failed: prev.failed + 1,
          results: [...prev.results, failResult]
        }));
      }

      // Pequena pausa entre criações para não saturar o provisionamento de acesso.
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsImporting(false);
    pauseRef.current = false;
    cancelRef.current = false;
    setIsPaused(false);

    toast({
      title: "Importação concluída",
      description: `${results.filter(r => r.success).length} de ${clients.length} clientes importados com sucesso`,
    });
  };

  const downloadTemplate = () => {
    // `produto` + `oferta` precisam casar com o catálogo (Produtos/Ofertas). Preço, periodicidade
    // e tipo (assinatura/avulso) vêm da oferta cadastrada — não da planilha.
    const template = [
      {
        nome_responsavel: 'João Silva',
        email: 'joao@exemplo.com',
        telefone: '11999999999',
        tipo_pessoa: 'fisica',
        produto: 'Endereço Fiscal',
        oferta: 'Plano Anual',
        status_contratacao: 'ATIVO',
        cpf_responsavel: '12345678901',
        razao_social: '',
        cnpj: '',
        endereco: 'Rua das Flores',
        numero_endereco: '123',
        complemento_endereco: 'Apt 45',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567',
        ultimo_pagamento: '2024-01-15',
        proximo_vencimento: '2025-01-15',
      },
      {
        nome_responsavel: 'Construtora Exemplo Ltda',
        email: 'contato@exemplo.com.br',
        telefone: '1133334444',
        tipo_pessoa: 'juridica',
        produto: '',
        oferta: '',
        status_contratacao: 'ATIVO',
        cpf_responsavel: '98765432100',
        razao_social: 'Construtora Exemplo Ltda',
        cnpj: '12345678000190',
        endereco: 'Av. Paulista',
        numero_endereco: '1000',
        complemento_endereco: 'Sala 12',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01310100',
        ultimo_pagamento: '',
        proximo_vencimento: '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
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
    pauseRef.current = false;
    cancelRef.current = false;
    setIsPaused(false);
  };

  return {
    isImporting,
    isPaused,
    importStats,
    parseExcelFile,
    getExcelHeaders,
    importClients,
    downloadTemplate,
    resetStats,
    validateClientData,
    pauseImport,
    resumeImport,
    cancelImport
  };
};