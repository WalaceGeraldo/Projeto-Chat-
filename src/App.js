import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen'; 
import './App.css';
import { supabase } from './supabaseClient'; // <-- NOVO: Importa cliente Supabase

function App() {
  const [user, setUser] = useState(null);
  // Estado para simular que o cliente Supabase está pronto para uso
  const [isReady, setIsReady] = useState(false); 

  // Efeito principal: Verifica a sessão do Supabase e carrega o nome do perfil.
  useEffect(() => {
    
    // 1. Função que busca o username na tabela 'profiles'
    const fetchUserProfile = async (user) => {
        // Busca o perfil na nova tabela 'profiles'
        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`username`) // Apenas precisamos do nome
            .eq('id', user.id)
            .single();

        if (error || !profile) {
            console.warn("[App] Perfil não encontrado. Usando a primeira parte do e-mail como fallback.");
            // Fallback: Se não achar perfil, usa a primeira parte do email
            setUser(user.email ? user.email.split('@')[0] : 'Desconhecido');
        } else {
            // SUCESSO: Define o estado 'user' com o nome do perfil.
            setUser(profile.username);
        }
    };

    // 2. Ouve eventos de autenticação (LOGIN, LOGOUT)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          fetchUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    // 3. Busca a sessão inicial ao carregar (para quem já estava logado)
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            fetchUserProfile(session.user);
        } 
        
        // Ativa o isReady (Substitui o setTimeout antigo)
        // Isso garante que a tela de login/chat só apareça após a verificação da sessão.
        setTimeout(() => { setIsReady(true); }, 500); 
    });


    // 4. Limpeza: Remove o listener de autenticação
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []); 

  // Função chamada pelo LoginScreen (Para o login manual sem OAuth)
  const handleLogin = (username) => {
    setUser(username); 
  };

  // Função chamada pelo ChatScreen (botão Sair)
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Erro ao sair:", error);
    }
    // O authListener (useEffect) cuidará de chamar setUser(null) após o signOut ser concluído
  };

  return (
    <div className="App">
      {/* Se o cliente não estiver pronto, mostra um loading screen simples */}
      {!isReady ? (
          <div className="loading-screen">Carregando Serviço de Chat...</div>
      ) : !user ? (
        <LoginScreen onLogin={handleLogin} /> 
      ) : (
        /* Passamos 'isReady' no lugar de 'socket'. */
        <ChatScreen user={user} isReady={isReady} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;