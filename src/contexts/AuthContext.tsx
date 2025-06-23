
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useTemporaryPassword } from '@/hooks/useTemporaryPassword';
import { cleanupAuthState } from '@/utils/authCleanup';
import { useAdminAuth, AdminUser } from '@/hooks/useAdminAuth';

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
  const { authenticateAdmin } = useAdminAuth();
  const fetchingUserDataRef = useRef(false);
  const initializingRef = useRef(false);

  const isAdminEmail = (email: string): boolean => {
    return email === 'onoffice1893@gmail.com' || 
           email === 'contato@onofficebelem.com.br' ||
           email.includes('@onoffice.com');
  };

  const createAdminUser = (adminData: AdminUser): AuthUser => {
    return {
      id: adminData.id,
      name: adminData.full_name,
      email: adminData.email,
      type: 'admin'
    };
  };

  const fetchUserData = async (session: Session) => {
    if (fetchingUserDataRef.current) {
      console.log('Busca de dados do usuário já em andamento, ignorando...');
      return;
    }

    fetchingUserDataRef.current = true;
    
    try {
      console.log('Buscando dados do usuário para:', session.user.email);
      
      // Verificar se é admin baseado no email
      const isAdminByEmail = isAdminEmail(session.user.email || '');
      
      console.log('Verificação admin por email:', isAdminByEmail);
      
      // Buscar profile do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.log('Erro ao buscar profile:', profileError);
      } else {
        console.log('Profile encontrado:', profile);
      }

      // Para admin, não buscar contratação
      let contratacao = null;
      if (!isAdminByEmail) {
        const { data: contratacaoData } = await supabase
          .from('contratacoes_clientes')
          .select('plano_selecionado, razao_social')
          .eq('user_id', session.user.id)
          .single();
        contratacao = contratacaoData;
      }

      // Determinar tipo baseado no email primeiro, depois no role do profile
      const isAdmin = isAdminByEmail || profile?.role === 'admin';

      console.log('Determinando tipo de usuário:', {
        email: session.user.email,
        profileRole: profile?.role,
        isAdminByEmail,
        isAdmin
      });

      // Admin não precisa trocar senha
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
      const isAdmin = isAdminEmail(session.user.email || '');
      
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
      console.log('=== INICIANDO LOGIN AVANÇADO ===');
      console.log('Email:', email);
      console.log('É email de admin?', isAdminEmail(email));
      
      // Limpar estado antes do login
      cleanupAuthState();
      
      // Se for email de admin, tentar autenticação admin primeiro
      if (isAdminEmail(email)) {
        console.log('Tentando autenticação admin...');
        const adminResult = await authenticateAdmin(email, password);
        
        if (adminResult.success && adminResult.admin) {
          console.log('Admin autenticado com sucesso via sistema independente');
          
          // Criar usuário admin no estado local
          const adminUser = createAdminUser(adminResult.admin);
          setUser(adminUser);
          
          // Criar uma sessão fictícia para admin
          const fakeSession = {
            user: {
              id: adminResult.admin.id,
              email: adminResult.admin.email,
            }
          } as Session;
          
          setSession(fakeSession);
          
          return { success: true, needsPasswordChange: false };
        } else {
          console.log('Autenticação admin falhou:', adminResult.error);
          return { success: false };
        }
      }
      
      // Para não-admin, usar sistema Supabase padrão
      console.log('Usando autenticação Supabase padrão...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Resultado do login no Supabase:', { data: !!data?.user, error: error?.message });

      if (error) {
        console.error('Erro no login Supabase:', error.message);
        return { success: false };
      }

      if (!data.user) {
        console.error('Login falhou - nenhum usuário retornado');
        return { success: false };
      }

      console.log('Login Supabase bem-sucedido:', data.user.email);

      // Verificar se precisa trocar senha
      let needsPasswordChange = false;
      try {
        needsPasswordChange = await checkIfPasswordNeedsChange(data.user.id);
      } catch (error) {
        console.log('Erro ao verificar se precisa trocar senha:', error);
        needsPasswordChange = false;
      }
      
      console.log('Precisa trocar senha?', needsPasswordChange);
      
      return { success: true, needsPasswordChange };
      
    } catch (error) {
      console.error('=== ERRO GERAL NO LOGIN ===');
      console.error('Erro:', error);
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
      
      // Se for usuário Supabase, executar logout
      if (session?.user?.id) {
        await supabase.auth.signOut({ scope: 'global' });
      }
      
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
