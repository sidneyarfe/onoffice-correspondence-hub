
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
           email === 'sidneyferreira12205@gmail.com' ||
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

  // Salvar sessão admin no localStorage
  const saveAdminSession = async (adminUser: AuthUser) => {
    try {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        isAdmin: true,
        timestamp: Date.now(),
        userId: adminUser.id
      }));
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
    if (fetchingUserDataRef.current) return;
    fetchingUserDataRef.current = true;
    
    try {
      const isAdminByEmail = isAdminEmail(session.user.email || '');
      
      // Buscar profile do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.log('Erro ao buscar profile:', profileError);
      }

      // Para não-admin, buscar contratação
      let contratacao = null;
      if (!isAdminByEmail) {
        const { data: contratacaoData } = await supabase
          .from('contratacoes_clientes')
          .select('plano_selecionado, razao_social')
          .eq('user_id', session.user.id)
          .single();
        contratacao = contratacaoData;
      }

      const isAdmin = isAdminByEmail || profile?.role === 'admin';

      let needsPasswordChange = false;
      if (!isAdmin) {
        try {
          needsPasswordChange = await checkIfPasswordNeedsChange(session.user.id);
        } catch (error) {
          needsPasswordChange = false;
        }
      }

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
    if (initializingRef.current) return;
    initializingRef.current = true;
    
    // Verificar se há sessão admin salva
    const savedAdminUser = loadAdminSession();
    if (savedAdminUser) {
      setUser(savedAdminUser);
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
    
    // Configure Supabase client
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session);
          }, 0);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
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
      cleanupAuthState();
      clearAdminSession();
      
      // Se for email de admin, tentar autenticação admin
      if (isAdminEmail(email)) {
        const adminResult = await authenticateAdmin(email, password);
        
        if (adminResult.success && adminResult.admin) {
          const adminUser = createAdminUser(adminResult.admin);
          setUser(adminUser);
          
          await saveAdminSession(adminUser);
          
          const fakeSession = {
            user: {
              id: adminResult.admin.id,
              email: adminResult.admin.email,
            }
          } as Session;
          
          setSession(fakeSession);
          
          return { success: true, needsPasswordChange: false };
        } else {
          return { success: false };
        }
      }
      
      // Para não-admin, usar sistema Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false };
      }

      if (!data.user) {
        return { success: false };
      }

      let needsPasswordChange = false;
      try {
        needsPasswordChange = await checkIfPasswordNeedsChange(data.user.id);
      } catch (error) {
        needsPasswordChange = false;
      }
      
      return { success: true, needsPasswordChange };
      
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const isAdmin = user?.type === 'admin' || hasValidAdminSession();
      
      setUser(null);
      setSession(null);
      
      if (isAdmin) {
        clearAdminSession();
      } else {
        if (session?.user?.id) {
          await supabase.auth.signOut({ scope: 'global' });
        }
      }
      
      cleanupAuthState();
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);
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
