
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useTemporaryPassword } from '@/hooks/useTemporaryPassword';
import { cleanupAuthState } from '@/utils/authCleanup';

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
  const { checkIfPasswordNeedsChange } = useTemporaryPassword();
  const fetchingUserDataRef = useRef(false);
  const initializingRef = useRef(false);

  const fetchUserData = async (session: Session) => {
    if (fetchingUserDataRef.current) {
      console.log('Busca de dados do usuário já em andamento, ignorando...');
      return;
    }

    fetchingUserDataRef.current = true;
    
    try {
      console.log('Buscando dados do usuário para:', session.user.email);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      console.log('Profile encontrado:', profile);

      const { data: contratacao } = await supabase
        .from('contratacoes_clientes')
        .select('plano_selecionado, razao_social')
        .eq('user_id', session.user.id)
        .single();

      // Determinar tipo de usuário - verificar admin primeiro
      const isAdmin = session.user.email === 'onoffice1893@gmail.com' || 
                     session.user.email?.includes('@onoffice.com') ||
                     profile?.role === 'admin';

      console.log('Determinando tipo de usuário:', {
        email: session.user.email,
        profileRole: profile?.role,
        isAdmin
      });

      // Verificar se precisa trocar senha (não para admin)
      let needsPasswordChange = false;
      if (!isAdmin) {
        try {
          needsPasswordChange = await checkIfPasswordNeedsChange(session.user.id);
        } catch (error) {
          console.log('Erro ao verificar se precisa trocar senha:', error);
          needsPasswordChange = false;
        }
      }
      
      console.log('Dados do usuário carregados:', {
        profile: profile?.full_name,
        needsPasswordChange,
        userType: isAdmin ? 'admin' : 'client'
      });

      setUser({
        id: session.user.id,
        name: profile?.full_name || session.user.email || '',
        email: session.user.email || '',
        type: isAdmin ? 'admin' : 'client',
        company: contratacao?.razao_social || undefined,
        plan: contratacao?.plano_selecionado || undefined,
        needsPasswordChange
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback para dados básicos
      const isAdmin = session.user.email === 'onoffice1893@gmail.com' || 
                     session.user.email?.includes('@onoffice.com');
      
      setUser({
        id: session.user.id,
        name: session.user.email || '',
        email: session.user.email || '',
        type: isAdmin ? 'admin' : 'client'
      });
    } finally {
      fetchingUserDataRef.current = false;
    }
  };

  useEffect(() => {
    if (initializingRef.current) {
      console.log('AuthProvider já inicializando, ignorando...');
      return;
    }

    initializingRef.current = true;
    console.log('Configurando AuthProvider...');
    
    // Configure Supabase client
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        setSession(session);
        
        if (session?.user) {
          // Defer user data fetching to prevent deadlocks
          setTimeout(() => {
            fetchUserData(session);
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
        setSession(session);
        setTimeout(() => {
          fetchUserData(session);
        }, 0);
      } else {
        setIsLoading(false);
      }
      initializingRef.current = false;
    });

    return () => {
      subscription.unsubscribe();
      initializingRef.current = false;
    };
  }, [checkIfPasswordNeedsChange]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      console.log('Executando login normal para:', email);
      
      // Limpar estado antes do login
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Erro no login:', error);
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
      console.log('Executando login com possível senha temporária para:', email);
      console.log('Senha fornecida:', password);
      console.log('Tentando login direto no Supabase Auth...');
      
      // Limpar estado antes do login
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Erro no login direto:', error);
        console.error('Código do erro:', error.message);
        
        // Se o email é de admin, tentar diagnóstico
        if (email === 'onoffice1893@gmail.com') {
          console.log('Tentando verificar se o usuário admin existe...');
          
          try {
            // Verificar se o usuário existe na tabela auth.users via função RPC
            const { data: userData, error: userError } = await supabase.rpc('get_user_contratacao_data', {
              p_user_id: 'e001c84b-501c-4fdc-9041-07db92942b2d' // ID do usuário admin
            });
            
            if (userError) {
              console.error('Erro ao buscar dados do usuário admin:', userError);
            } else {
              console.log('Dados do usuário admin encontrados:', userData);
            }
          } catch (checkError) {
            console.error('Erro ao verificar usuário admin:', checkError);
          }
        }
        
        return { success: false };
      }

      if (!data.user) {
        return { success: false };
      }

      console.log('Login successful:', data.user.email);

      // Verificar se é uma senha temporária que precisa ser trocada (não para admin)
      let needsPasswordChange = false;
      const isAdmin = data.user.email === 'onoffice1893@gmail.com' || 
                     data.user.email?.includes('@onoffice.com');
      
      if (!isAdmin) {
        try {
          needsPasswordChange = await checkIfPasswordNeedsChange(data.user.id);
        } catch (error) {
          console.log('Erro ao verificar se precisa trocar senha:', error);
          needsPasswordChange = false;
        }
      }
      
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
      console.log('Executando logout...');
      
      // Limpar estado local primeiro
      setUser(null);
      setSession(null);
      
      // Executar logout no Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      // Limpar cache e storage
      cleanupAuthState();
      
      // Aguardar um momento antes de redirecionar
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);
      // Mesmo com erro, limpar estado e redirecionar
      cleanupAuthState();
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, login, loginWithTemporaryPassword, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
