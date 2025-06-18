
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useTemporaryPassword } from '@/hooks/useTemporaryPassword';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  type: 'client' | 'admin';
  company?: string;
  plan?: string;
  needsPasswordChange?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithTemporaryPassword: (email: string, password: string) => Promise<{ success: boolean; needsPasswordChange?: boolean }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { validateTemporaryPassword, checkIfPasswordNeedsChange } = useTemporaryPassword();

  useEffect(() => {
    // Configure Supabase client
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        
        if (session?.user) {
          // Fetch user profile data
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              const { data: contratacao } = await supabase
                .from('contratacoes_clientes')
                .select('plano_selecionado, razao_social')
                .eq('user_id', session.user.id)
                .single();

              // Verificar se precisa trocar senha
              const needsPasswordChange = await checkIfPasswordNeedsChange(session.user.id);

              setUser({
                id: session.user.id,
                name: profile?.full_name || session.user.email || '',
                email: session.user.email || '',
                type: session.user.email?.includes('@onoffice.com') ? 'admin' : 'client',
                company: contratacao?.razao_social || undefined,
                plan: contratacao?.plano_selecionado || undefined,
                needsPasswordChange
              });
            } catch (error) {
              console.error('Error fetching user data:', error);
              setUser({
                id: session.user.id,
                name: session.user.email || '',
                email: session.user.email || '',
                type: session.user.email?.includes('@onoffice.com') ? 'admin' : 'client'
              });
            }
          }, 0);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('Existing session found');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkIfPasswordNeedsChange]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (data.user) {
        console.log('Login successful:', data.user.email);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithTemporaryPassword = async (email: string, password: string): Promise<{ success: boolean; needsPasswordChange?: boolean }> => {
    setIsLoading(true);
    
    try {
      // Primeiro, tentar login normal
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return { success: false };
      }

      if (!data.user) {
        return { success: false };
      }

      console.log('Login successful:', data.user.email);

      // Verificar se é uma senha temporária que precisa ser trocada
      const needsPasswordChange = await checkIfPasswordNeedsChange(data.user.id);
      
      if (needsPasswordChange) {
        console.log('Usuário precisa trocar a senha');
        return { success: true, needsPasswordChange: true };
      }

      return { success: true, needsPasswordChange: false };
      
    } catch (error) {
      console.error('Login error:', error);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, login, loginWithTemporaryPassword, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
