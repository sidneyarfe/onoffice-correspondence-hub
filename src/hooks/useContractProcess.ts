
import { useState, useCallback } from 'react';

export type ContractStatus = 
  | 'form_filling' 
  | 'form_submitted' 
  | 'contract_sending' 
  | 'contract_sent' 
  | 'contract_signed' 
  | 'payment_processing' 
  | 'payment_approved' 
  | 'account_created' 
  | 'completed';

interface ContractProcessState {
  status: ContractStatus;
  progress: number;
  error: string | null;
  contractId?: string;
  paymentId?: string;
}

const statusProgress = {
  form_filling: 10,
  form_submitted: 20,
  contract_sending: 30,
  contract_sent: 40,
  contract_signed: 60,
  payment_processing: 70,
  payment_approved: 85,
  account_created: 95,
  completed: 100,
};

const statusLabels = {
  form_filling: 'Preenchendo formulário',
  form_submitted: 'Formulário enviado',
  contract_sending: 'Preparando contrato',
  contract_sent: 'Contrato enviado para assinatura',
  contract_signed: 'Contrato assinado',
  payment_processing: 'Processando pagamento',
  payment_approved: 'Pagamento aprovado',
  account_created: 'Conta criada',
  completed: 'Processo concluído',
};

export const useContractProcess = () => {
  const [state, setState] = useState<ContractProcessState>({
    status: 'form_filling',
    progress: 10,
    error: null,
  });

  const updateStatus = useCallback((status: ContractStatus, additionalData?: Partial<ContractProcessState>) => {
    setState(prev => ({
      ...prev,
      status,
      progress: statusProgress[status],
      error: null,
      ...additionalData,
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const getStatusLabel = useCallback((status?: ContractStatus) => {
    return statusLabels[status || state.status];
  }, [state.status]);

  return {
    ...state,
    updateStatus,
    setError,
    getStatusLabel,
  };
};
