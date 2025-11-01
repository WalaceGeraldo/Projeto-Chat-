import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient'; // Importa o cliente Supabase
import LoginScreen from './components/LoginScreen';
import OnboardingScreen from './components/OnboardingScreen'; // Importa a nova tela
import ChatScreen from './components/ChatScreen'; 
import './App.css';

function App() {
  // 'user' armazena o objeto de autenticação do Supabase (id, email)
  const [user, setUser] = useState(null); 
  // 'profile' armazena o nome de exibição (username) da tabela 'profiles'
  const [profile, setProfile] = useState(null); 
  
  // Controla se a sessão inicial foi carregada
  const [isReady, setIsReady] = useState(false); 

  // --- 1. FUNÇÃO PARA CARREGAR O PERFIL (USERNAME) ---
  const fetchUserProfile = useCallback(async (supabaseUser) => {
    if (!supabaseUser) {
        setProfile(null);
        return;
    }
    
    // Busca o nome de usuário ('username') na tabela 'profiles'
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', supabaseUser.id)
      .single(); 

    // O código PGRST116 significa "nenhum resultado encontrado" (normal para usuários novos)
    if (error && error.code !== 'PGRST116') { 
        console.error('Erro ao buscar perfil:', error);
    }
    
    // Define o perfil. Se o perfil for NULL no DB, o estado será NULL.
    setProfile(data ? data.username : null);
  }, []); 


  // --- 2. EFEITO DE INICIALIZAÇÃO E OUVINTE DE SESSÃO (CORRIGIDO PARA RECARGA) ---
  useEffect(() => {
    
    const checkSessionAndLoadProfile = async () => {
        try {
            // 2.1 Verifica o estado inicial da sessão
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.error("Erro ao obter sessão:", sessionError);
            }
            
            const initialUser = session?.user ?? null;
            setUser(initialUser);
            
            if (initialUser) {
                // CRÍTICO: Espera o perfil ser carregado antes de marcar como pronto
                await fetchUserProfile(initialUser); 
            }
            
        } catch (e) {
            console.error("ERRO CRÍTICO NA INICIALIZAÇÃO:", e);
        } finally {
            // Garante que o aplicativo SEMPRE saia da tela de loading, mesmo em caso de erro.
            setIsReady(true); 
        }
    };
    
    // 2.2 Configura o ouvinte de eventos de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    // Chama a função principal de verificação de sessão APENAS UMA VEZ
    checkSessionAndLoadProfile();


    // Limpeza
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile]);


  // --- 3. LÓGICA DE NAVEGAÇÃO / ROTEAMENTO (RENDERIZAÇÃO CONDICIONAL) ---
  let content = null;
  
  if (!isReady) {
    // 3.1 Estado de carregamento inicial
    content = <div className="loading-screen">Carregando Serviço de Chat...</div>;
  } else if (!user) {
    // 3.2 Tela de Login/Registro (Não autenticado)
    const handleLoginPlaceholder = () => { /* Supabase Listener faz o trabalho real */ }; 
    content = <LoginScreen onLogin={handleLoginPlaceholder} />; 
  } else if (profile === null) { 
    // 3.3 Tela de Configuração (Onboarding) - CRÍTICO: Verifica estritamente se profile é NULL
    
    const handleProfileUpdate = (newUsername) => {
        // Callback: Atualiza o estado local do perfil para sair do Onboarding
        setProfile(newUsername);
    };
    
    content = (
        <OnboardingScreen 
            user={user} // Passa o objeto Auth User (com ID)
            onProfileUpdated={handleProfileUpdate} 
        />
    );
  } else {
    // 3.4 Tela Principal do Chat (Tudo OK)
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };
    
    content = (
        <ChatScreen 
            user={profile} // Passa o nome de exibição (username)
            isReady={true} 
            onLogout={handleLogout} 
        />
    );
  }


  return (
    <div className="App">
      {content}
    </div>
  );
}

export default App;