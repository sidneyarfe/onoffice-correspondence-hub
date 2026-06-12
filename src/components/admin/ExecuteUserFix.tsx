import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fixLuiscfelipecAccount } from '@/utils/fixMissingUser';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const ExecuteUserFix = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [autoExecuted, setAutoExecuted] = useState(false);

  const executeFix = async () => {
    setIsExecuting(true);
    setResult(null);
    
    try {
      const fixResult = await fixLuiscfelipecAccount();
      setResult(fixResult);
      
      if (fixResult.success && fixResult.loginWorks) {
        toast({
          title: "✅ PROBLEMA RESOLVIDO!",
          description: "Usuário criado no Supabase Auth e login testado com sucesso!",
        });
      } else if (fixResult.userCreated && !fixResult.loginWorks) {
        toast({
          title: "⚠️ Usuário criado, mas login ainda falha",
          description: "Aguarde alguns segundos e tente fazer login.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Falha na correção",
          description: fixResult.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro na execução:', error);
      toast({
        title: "Erro",
        description: "Falha ao executar correção",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Executar automaticamente uma única vez
  useEffect(() => {
    if (!autoExecuted) {
      console.log('Auto-executando correção para luiscfelipec@gmail.com...');
      setAutoExecuted(true);
      executeFix();
    }
  }, [autoExecuted]);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-on-lime" />
          Execução da Correção
        </CardTitle>
        <CardDescription>
          Executando criação do usuário luiscfelipec@gmail.com no Supabase Auth
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-2">
          <p><strong>Email:</strong> luiscfelipec@gmail.com</p>
          <p><strong>Senha:</strong> iIwG1cfDJSrD</p>
          <p><strong>Ação:</strong> Criar usuário faltante no Supabase Auth</p>
        </div>

        {isExecuting && (
          <div className="flex items-center gap-2 text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Executando correção...</span>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            {result.success && result.loginWorks ? (
              <div className="flex items-center gap-2 text-on-lime">
                <CheckCircle className="h-4 w-4" />
                <span className="font-semibold">✅ SUCESSO TOTAL! Login funcionando!</span>
              </div>
            ) : result.userCreated && !result.loginWorks ? (
              <div className="flex items-center gap-2 text-orange-300">
                <CheckCircle className="h-4 w-4" />
                <span>⚠️ Usuário criado, mas login ainda falha</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-4 w-4" />
                <span>❌ Falha na correção</span>
              </div>
            )}
            
            {result.error && (
              <p className="text-sm text-red-400">{result.error}</p>
            )}
            
            {result.message && (
              <p className="text-sm text-on-lime">{result.message}</p>
            )}
          </div>
        )}

        <Button 
          onClick={executeFix}
          disabled={isExecuting}
          variant={result?.success ? "outline" : "default"}
          className="w-full"
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Executando...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {result?.success ? "Executar Novamente" : "Executar Correção"}
            </>
          )}
        </Button>

        {result?.success && result?.loginWorks && (
          <div className="bg-on-lime/10 border border-on-lime/30 rounded-lg p-3">
            <p className="text-sm text-on-lime">
              🎉 <strong>Problema resolvido!</strong> Agora você pode fazer login com:
            </p>
            <ul className="text-sm text-on-lime mt-1 space-y-1">
              <li>• Email: luiscfelipec@gmail.com</li>
              <li>• Senha: iIwG1cfDJSrD</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};