import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTempPasswordSync } from '@/hooks/useTempPasswordSync';
import { toast } from '@/hooks/use-toast';

export const TempPasswordSyncUtil = () => {
  const [email, setEmail] = useState('luiscfelipec@gmail.com');
  const { syncUserByEmail, loading } = useTempPasswordSync();

  const handleSync = async () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Digite um email válido",
        variant: "destructive",
      });
      return;
    }

    const success = await syncUserByEmail(email);
    
    if (success) {
      toast({
        title: "Sucesso!",
        description: `Senha temporária sincronizada para ${email}. Agora o login deve funcionar.`,
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sincronizar Senha Temporária</CardTitle>
        <CardDescription>
          Ferramenta para sincronizar senhas temporárias existentes com o Supabase Auth
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email do Usuário</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite o email do usuário"
          />
        </div>
        <Button 
          onClick={handleSync} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Sincronizando...' : 'Sincronizar Senha'}
        </Button>
        <div className="text-xs text-muted-foreground">
          <p><strong>Instruções:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Digite o email do usuário que não consegue fazer login</li>
            <li>Clique em "Sincronizar Senha"</li>
            <li>Aguarde a confirmação de sucesso</li>
            <li>Teste o login com a senha temporária</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};