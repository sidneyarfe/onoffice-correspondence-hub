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

// Chaves para persistência local de admins
const ADMIN_SESSION_KEY = 'onoffice_admin_session';
const ADMIN_USER_KEY = 'onoffice_admin_user';

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

  // Função para criar/atualizar perfil admin na tabela profiles
  const ensureAdminProfile = async (adminUser: AuthUser) => {
    try {
      console.log('=== GARANTINDO PERFIL ADMIN ===');
      console.log('Admin:', adminUser.email);

      // Usar uma abordagem mais direta para garantir que o perfil admin exista
      // Primeiro, tentamos um upsert usando a função SQL diretamente
      const { data, error } = await supabase.rpc('upsert_admin_profile', {
        p_user_id: adminUser.id,
        p_email: adminUser.email,
        p_full_name: adminUser.name
      });

      if (error) {
        console.error('Erro ao criar perfil admin via RPC:', error);
        
        // Fallback: tentar inserção direta usando o client Supabase com bypass de RLS
        try {
          const { data: insertData, error: insertError } = await supabase
            .from('profiles')
            .upsert({
              id: adminUser.id,
              email: adminUser.email,
              full_name: adminUser.name,
              role: 'admin'
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            });

          if (insertError) {
            console.error('Erro no fallback de inserção:', insertError);
          } else {
            console.log('Perfil admin criado via fallback:', insertData);
          }
        } catch (fallbackError) {
          console.error('Erro no fallback completo:', fallbackError);
        }
      } else {
        console.log('Perfil admin garantido via RPC:', data);
      }
    } catch (error) {
      console.error('Erro geral ao garantir perfil admin:', error);
    }
  };

  // Salvar sessão admin no localStorage
  const saveAdminSession = async (adminUser: AuthUser) => {
    try {
      // Garantir que o perfil admin existe na tabela profiles
      await ensureAdminProfile(adminUser);

      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        isAdmin: true,
        timestamp: Date.now(),
        userId: adminUser.id
      }));
      console.log('Sessão admin salva no localStorage');
    } catch (error) {
      console.error('Erro ao salvar sessão admin:', error);
    }
  };

  // Carregar sessão admin do localStorage
  const loadAdminSession = (): AuthUser | null => {
    try {
      const adminUserData = localStorage.getItem(ADMIN_USER_KEY);
      const adminSessionData = localStorage.getItem(ADMIN_SESSION_KEY);
      
      if (!adminUserData || !adminSessionData) {
        return null;
      }

      const adminUser = JSON.parse(adminUserData) as AuthUser;
      const adminSession = JSON.parse(adminSessionData);
      
      // Verificar se a sessão não expirou (24 horas)
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (Date.now() - adminSession.timestamp > TWENTY_FOUR_HOURS) {
        clearAdminSession();
        return null;
      }

      console.log('Sessão admin carregada do localStorage:', adminUser.email);
      return adminUser;
    } catch (error) {
      console.error('Erro ao carregar sessão admin:', error);
      clearAdminSession();
      return null;
    }
  };

  // Limpar sessão admin
  const clearAdminSession = () => {
    try {
      localStorage.removeItem(ADMIN_USER_KEY);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      console.log('Sessão admin removida do localStorage');
    } catch (error) {
      console.error('Erro ao limpar sessão admin:', error);
    }
  };

  // Verificar se há sessão admin válida
  const hasValidAdminSession = (): boolean => {
    const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!adminSession) return false;

    try {
      const session = JSON.parse(adminSession);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      return session.isAdmin && (Date.now() - session.timestamp <= TWENTY_FOUR_HOURS);
    } catch {
      return false;
    }
  };

  // Função para buscar dados do usuário
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
    
    // Primeiro, verificar se há sessão admin salva
    const savedAdminUser = loadAdminSession();
    if (savedAdminUser) {
      console.log('Sessão admin encontrada, restaurando:', savedAdminUser.email);
      setUser(savedAdminUser);
      
      // Garantir que o perfil admin existe
      ensureAdminProfile(savedAdminUser);
      
      // Criar sessão fictícia para admin
      const fakeSession = {
        user: {
          id: savedAdminUser.id,
          email: savedAdminUser.email,
        }
      } as Session;
      setSession(fakeSession);
      setIsLoading(false);
      initializingRef.current = false;
      return;
    }
    
    // Configure Supabase client para usuários normais
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
      clearAdminSession();
      
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
      clearAdminSession();
      
      // Se for email de admin, tentar autenticação admin primeiro
      if (isAdminEmail(email)) {
        console.log('Tentando autenticação admin...');
        const adminResult = await authenticateAdmin(email, password);
        
        if (adminResult.success && adminResult.admin) {
          console.log('Admin autenticado com sucesso via sistema independente');
          
          // Criar usuário admin no estado local
          const adminUser = createAdminUser(adminResult.admin);
          setUser(adminUser);
          
          // Salvar sessão admin no localStorage e garantir perfil
          await saveAdminSession(adminUser);
          
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
      
      // Verificar se é admin
      const isAdmin = user?.type === 'admin' || hasValidAdminSession();
      
      // Limpar estado local primeiro
      setUser(null);
      setSession(null);
      
      if (isAdmin) {
        // Para admin, limpar sessão local
        clearAdminSession();
        console.log('Logout admin executado');
      } else {
        // Se for usuário Supabase, executar logout
        if (session?.user?.id) {
          await supabase.auth.signOut({ scope: 'global' });
        }
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
      clearAdminSession();
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
