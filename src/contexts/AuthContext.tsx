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

  // Função robusta para garantir perfil admin com múltiplas tentativas e fallbacks
  const ensureAdminProfile = async (adminUser: AuthUser, retryCount = 0): Promise<boolean> => {
    const maxRetries = 3;
    
    try {
      console.log(`=== GARANTINDO PERFIL ADMIN (Tentativa ${retryCount + 1}) ===`);
      console.log('Admin:', adminUser.email);

      // Primeira tentativa: usar função SQL privilegiada se disponível
      if (retryCount === 0) {
        try {
          console.log('Tentando função SQL privilegiada...');
          const { data: sqlResult, error: sqlError } = await supabase.rpc('ensure_admin_profile', {
            p_user_id: adminUser.id,
            p_email: adminUser.email,
            p_full_name: adminUser.name
          });

          if (!sqlError && sqlResult) {
            console.log('✓ Perfil admin garantido via função SQL');
            return true;
          } else {
            console.log('Função SQL não disponível, usando fallback...');
          }
        } catch (sqlFunctionError) {
          console.log('Função SQL não disponível, usando fallback direto...');
        }
      }

      // Fallback: tentar inserção direta com upsert
      console.log('Usando inserção direta...');
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.name,
          role: 'admin',
          password_changed: true
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (!error) {
        console.log('✓ Perfil admin garantido via upsert');
        return true;
      }

      console.error('Erro no upsert:', error);

      // Fallback final: tentar inserção simples
      console.log('Tentando inserção simples...');
      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.name,
          role: 'admin',
          password_changed: true
        });

      if (!insertError) {
        console.log('✓ Perfil admin criado via inserção simples');
        return true;
      }

      console.error('Erro na inserção simples:', insertError);

      // Se chegou aqui, tentar novamente se ainda há tentativas
      if (retryCount < maxRetries - 1) {
        console.log(`Tentando novamente em 1 segundo... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await ensureAdminProfile(adminUser, retryCount + 1);
      }

      return false;
    } catch (error) {
      console.error(`Erro geral na tentativa ${retryCount + 1}:`, error);
      
      if (retryCount < maxRetries - 1) {
        console.log(`Tentando novamente em 2 segundos... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await ensureAdminProfile(adminUser, retryCount + 1);
      }
      
      return false;
    }
  };

  // Sistema de verificação e reparo de saúde admin
  const checkAndRepairAdminHealth = async () => {
    try {
      console.log('=== VERIFICANDO SAÚDE DO SISTEMA ADMIN ===');
      
      // Verificar se há sessão admin salva
      const adminUser = loadAdminSession();
      if (!adminUser) {
        console.log('Nenhuma sessão admin para verificar');
        return true;
      }

      // Verificar se o perfil admin existe
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', adminUser.id)
        .eq('role', 'admin')
        .single();

      if (error || !profile) {
        console.log('❌ Perfil admin não encontrado, tentando reparar...');
        const repaired = await ensureAdminProfile(adminUser);
        
        if (repaired) {
          console.log('✓ Sistema admin reparado com sucesso');
          return true;
        } else {
          console.error('❌ Falha ao reparar sistema admin');
          return false;
        }
      } else {
        console.log('✓ Sistema admin saudável');
        return true;
      }
    } catch (error) {
      console.error('Erro na verificação de saúde admin:', error);
      return false;
    }
  };

  // Salvar sessão admin no localStorage
  const saveAdminSession = async (adminUser: AuthUser) => {
    try {
      console.log('=== SALVANDO SESSÃO ADMIN ===');
      
      // Garantir que o perfil admin existe com retry
      const profileEnsured = await ensureAdminProfile(adminUser);
      
      if (!profileEnsured) {
        console.warn('⚠️ Não foi possível garantir perfil admin, mas continuando...');
      }

      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        isAdmin: true,
        timestamp: Date.now(),
        userId: adminUser.id,
        version: '2.0' // Para identificar sessões com novo sistema
      }));
      
      console.log('✓ Sessão admin salva no localStorage');
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

      console.log('✓ Sessão admin carregada:', adminUser.email);
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

  // Função para buscar dados do usuário com timeout e fallbacks
  const fetchUserData = async (session: Session) => {
    if (fetchingUserDataRef.current) {
      console.log('Busca de dados do usuário já em andamento, ignorando...');
      return;
    }

    fetchingUserDataRef.current = true;
    
    try {
      console.log('Buscando dados do usuário para:', session.user.email);
      
      // Timeout para evitar loading infinito
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na busca de dados')), 10000);
      });
      
      // Verificar se é admin baseado no email
      const isAdminByEmail = isAdminEmail(session.user.email || '');
      
      console.log('Verificação admin por email:', isAdminByEmail);
      
      // Buscar profile do usuário com timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      let profile = null;
      let profileError = null;

      try {
        const result = await Promise.race([profilePromise, timeoutPromise]);
        profile = (result as any).data;
        profileError = (result as any).error;
      } catch (timeoutError) {
        console.warn('Timeout na busca do perfil, usando fallback');
        profileError = timeoutError;
      }

      if (profileError) {
        console.log('Erro ao buscar profile:', profileError);
        
        // Para admin, tentar criar perfil se não existir
        if (isAdminByEmail) {
          console.log('Admin sem perfil, tentando criar...');
          const adminUserData = {
            id: session.user.id,
            name: session.user.email || '',
            email: session.user.email || '',
            type: 'admin' as const
          };
          
          await ensureAdminProfile(adminUserData);
          
          // Tentar buscar novamente
          try {
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            profile = newProfile;
          } catch (retryError) {
            console.warn('Não foi possível buscar perfil após criação');
          }
        }
      } else {
        console.log('Profile encontrado:', profile);
      }

      // Para admin, não buscar contratação
      let contratacao = null;
      if (!isAdminByEmail) {
        try {
          const contratacaoPromise = supabase
            .from('contratacoes_clientes')
            .select('plano_selecionado, razao_social')
            .eq('user_id', session.user.id)
            .single();
            
          const contratacaoResult = await Promise.race([contratacaoPromise, timeoutPromise]);
          contratacao = (contratacaoResult as any).data;
        } catch (contratacaoError) {
          console.warn('Erro ou timeout ao buscar contratação:', contratacaoError);
        }
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
      
      // Verificar saúde do sistema admin em background
      checkAndRepairAdminHealth();
      
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
