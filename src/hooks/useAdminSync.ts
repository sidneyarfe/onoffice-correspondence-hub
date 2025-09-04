import { useState } from 'react';
import { createAdminInAuth, fixOnOfficeAdmin, type CreateAdminResult } from '@/utils/createAdminInAuth';
import { toast } from '@/hooks/use-toast';

export const useAdminSync = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CreateAdminResult | null>(null);

  const syncAdmin = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const syncResult = await createAdminInAuth(email, password, fullName);
      setResult(syncResult);
      
      if (syncResult.success) {
        toast({
          title: "✅ Sucesso!",
          description: syncResult.message,
        });
      } else {
        toast({
          title: "❌ Erro",
          description: syncResult.message,
          variant: "destructive",
        });
      }
      
      return syncResult;
    } catch (error) {
      const errorResult: CreateAdminResult = {
        success: false,
        message: 'Erro inesperado na sincronização',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      
      setResult(errorResult);
      toast({
        title: "❌ Erro",
        description: errorResult.message,
        variant: "destructive",
      });
      
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  };

  const fixOnOfficeAdminAccount = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const syncResult = await fixOnOfficeAdmin();
      setResult(syncResult);
      
      if (syncResult.success) {
        toast({
          title: "✅ Admin Corrigido!",
          description: "Conta onoffice1893@gmail.com sincronizada. Recuperação de senha agora funciona!",
        });
      } else {
        toast({
          title: "❌ Falha na Correção",
          description: syncResult.message,
          variant: "destructive",
        });
      }
      
      return syncResult;
    } catch (error) {
      const errorResult: CreateAdminResult = {
        success: false,
        message: 'Erro inesperado ao corrigir admin',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      
      setResult(errorResult);
      toast({
        title: "❌ Erro",
        description: errorResult.message,
        variant: "destructive",
      });
      
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syncAdmin,
    fixOnOfficeAdminAccount,
    isLoading,
    result
  };
};