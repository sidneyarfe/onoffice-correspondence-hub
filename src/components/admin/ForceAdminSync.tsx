import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminSync } from '@/hooks/useAdminSync';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const ForceAdminSync = () => {
  const { fixOnOfficeAdminAccount, isLoading, result } = useAdminSync();

  const handleSync = async () => {
    await fixOnOfficeAdminAccount();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Sincronização Admin - Recuperação de Senha
        </CardTitle>
        <CardDescription>
          Força a criação do usuário admin no sistema de autenticação do Supabase para permitir recuperação de senha
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-800">
            <p><strong>Problema:</strong> O admin <code>onoffice1893@gmail.com</code> existe apenas no sistema customizado, mas não no sistema nativo de autenticação.</p>
            <p><strong>Solução:</strong> Esta função criará o usuário no sistema nativo, permitindo que a recuperação de senha funcione.</p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={handleSync}
            disabled={isLoading}
            size="lg"
            className="min-w-[200px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Corrigir Admin
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className="mt-6 p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Sucesso" : "Erro"}
                  </Badge>
                  {result.userId && (
                    <Badge variant="outline" className="text-xs">
                      ID: {result.userId.slice(0, 8)}...
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm font-medium">
                  {result.message}
                </p>
                
                {result.error && (
                  <details className="text-xs text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-800">
                      Detalhes técnicos
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {result.error}
                    </pre>
                  </details>
                )}
                
                {result.success && (
                  <div className="text-sm text-green-700 bg-green-50 p-3 rounded border border-green-200 mt-3">
                    <p><strong>✅ Próximos passos:</strong></p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>A recuperação de senha agora deve funcionar normalmente</li>
                      <li>Teste em: <a href="/forgot-password" className="underline hover:text-green-800">/forgot-password</a></li>
                      <li>O login normal continua funcionando como antes</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ForceAdminSync;