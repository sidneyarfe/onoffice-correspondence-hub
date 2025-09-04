import { useEffect, useState } from 'react';
import { executeAdminFix } from '@/utils/executeAdminFix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const ImmediateAdminFix = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => {
    const runFix = async () => {
      console.log('🚀 Componente executando correção automática...');
      
      try {
        const result = await executeAdminFix();
        
        if (result.success) {
          setStatus('success');
          setMessage(result.message);
          setDetails(`Usuario ID: ${result.userId || 'N/A'}`);
        } else {
          setStatus('error');
          setMessage(result.message);
          setDetails(result.error || 'Erro desconhecido');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Erro inesperado na execução');
        setDetails(error instanceof Error ? error.message : 'Erro desconhecido');
      }
    };

    runFix();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
          {status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
          {status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
          Correção Automática - Admin onoffice1893@gmail.com
        </CardTitle>
        <CardDescription>
          Executando correção imediata para sincronizar admin com sistema de autenticação
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={
            status === 'loading' ? 'secondary' :
            status === 'success' ? 'default' : 'destructive'
          }>
            {status === 'loading' && 'Executando...'}
            {status === 'success' && 'Concluído'}
            {status === 'error' && 'Falhou'}
          </Badge>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="font-medium mb-2">{message}</p>
          {details && (
            <details className="text-sm text-gray-600">
              <summary className="cursor-pointer hover:text-gray-800">
                Detalhes técnicos
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {details}
              </pre>
            </details>
          )}
        </div>

        {status === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-800">
              <p><strong>✅ Sucesso! Próximos passos:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Acesse <a href="/forgot-password" className="underline hover:text-green-900">/forgot-password</a></li>
                <li>Digite: <code>onoffice1893@gmail.com</code></li>
                <li>A recuperação de senha agora deve funcionar</li>
                <li>O login normal continua funcionando</li>
              </ul>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-800">
              <p><strong>❌ Falha na correção</strong></p>
              <p>Tente usar o componente manual em <a href="/admin-sync" className="underline">/admin-sync</a></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImmediateAdminFix;