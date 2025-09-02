import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTempPasswordSync } from '@/hooks/useTempPasswordSync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';

export const TempPasswordResync = () => {
  const [email, setEmail] = useState('luiscfelipec@gmail.com');
  const [manualPassword, setManualPassword] = useState('iIwG1cfDJSrD');
  const { syncUserByEmail, syncTemporaryPassword, loading } = useTempPasswordSync();

  const handleResyncByEmail = async () => {
    if (!email.trim()) {
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
        description: `Senha temporária re-sincronizada para ${email}`,
      });
      // Limpar campos após sucesso
      setEmail('');
      setManualPassword('');
    }
  };

  const handleManualResync = async () => {
    if (!email.trim() || !manualPassword.trim()) {
      toast({
        title: "Erro",
        description: "Digite email e senha válidos",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('=== INICIANDO SINCRONIZAÇÃO MANUAL ===');
      console.log('Email:', email);
      console.log('Senha fornecida:', manualPassword);
      
      // Buscar dados completos do usuário
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, temporary_password_hash, password_changed')
        .eq('email', email)
        .maybeSingle();

      console.log('Dados do usuário encontrados:', userData);

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        toast({
          title: "Erro",
          description: `Erro ao buscar usuário: ${userError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!userData) {
        console.log('Usuário não encontrado no banco de dados');
        toast({
          title: "Erro",
          description: "Usuário não encontrado no banco de dados",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Usuário encontrado. Iniciando sincronização...');
      const success = await syncTemporaryPassword(userData.id, manualPassword);
      
      if (success) {
        console.log('🎉 Sincronização manual concluída com sucesso');
        // Não limpar campos para facilitar testes
      }
    } catch (error) {
      console.error('Erro na sincronização manual:', error);
      toast({
        title: "Erro",
        description: `Falha na sincronização manual: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Re-sincronizar Senha Temporária
        </CardTitle>
        <CardDescription>
          Ferramenta para corrigir problemas de sincronização de senhas temporárias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email do Usuário</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@exemplo.com"
          />
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleResyncByEmail}
            disabled={loading || !email.trim()}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Re-sincronizar por Email
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-password">Senha Específica</Label>
            <Input
              id="manual-password"
              type="text"
              value={manualPassword}
              onChange={(e) => setManualPassword(e.target.value)}
              placeholder="Senha temporária específica"
            />
          </div>

          <Button 
            onClick={handleManualResync}
            disabled={loading || !email.trim() || !manualPassword.trim()}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizar Senha Manual
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Re-sincronizar por Email:</strong> Busca a senha temporária no banco e re-sincroniza</p>
          <p><strong>Senha Manual:</strong> Sincroniza uma senha específica fornecida</p>
        </div>
      </CardContent>
    </Card>
  );
};