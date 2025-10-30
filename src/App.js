import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen'; 
import './App.css';
// NOVO: Importa o cliente Supabase
import { supabase } from './supabaseClient'; 

function App() {
  // O estado 'user' agora armazena o nome/email do usuário logado.
  const [user, setUser] = useState(null); 
  // Estado para controlar a exibição da tela de carregamento inicial (session loading)
  const [loading, setLoading] = useState(true); 

  // --- Listener de Autenticação Supabase (Gestão de Estado) ---
  useEffect(() => {
    // 1. Busca a sessão inicial
    const fetchSession = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error("Erro ao buscar sessão inicial:", error);
        }

        // Se houver sessão, define o usuário (usamos o email como nome de usuário)
        if (session) {
            setUser(session.user.email || 'Usuário Desconhecido'); 
        }
        setLoading(false); // Carregamento inicial completo

        // 2. Inicia o listener de mudanças de estado (Login/Logout)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, currentSession) => {
                if (currentSession) {
                    // Logado: Define o usuário com o email da sessão
                    setUser(currentSession.user.email || 'Usuário');
                } else {
                    // Deslogado: Limpa o estado
                    setUser(null);
                }
            }
        );
        
        return () => {
            // Limpeza: Remove o listener ao desmontar o componente
            authListener?.subscription.unsubscribe();
        };
    };

    fetchSession();
  }, []); 
  
  // Função chamada pelo LoginScreen (Agora é um placeholder, pois o useEffect lida com o estado)
  const handleLogin = (username) => {
    // O estado do usuário será atualizado pelo listener 'onAuthStateChange'
    // após o LoginScreen chamar supabase.auth.signIn()
    console.log(`Tentativa de Login para: ${username}. Aguardando confirmação do listener Supabase.`);
  };


  // --- Função de Logout (CORRIGIDA) ---
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut(); 

    if (error) {
        console.error("[Supabase] Erro ao fazer logout:", error);
        alert("Falha ao sair. Tente novamente.");
    }
    // O listener 'onAuthStateChange' fará o trabalho de definir setUser(null)
  };

  return (
    <div className="App">
      {/* Se estiver carregando a sessão inicial */}
      {loading ? (
          <div className="loading-screen">Carregando Sessão...</div>
      ) : !user ? (
        // Tela de Login
        <LoginScreen onLogin={handleLogin} /> 
      ) : (
        // Tela de Chat (isReady é true pois a sessão foi carregada)
        <ChatScreen 
            user={user} 
            isReady={true} 
            onLogout={handleLogout} 
        />
      )}
    </div>
  );
}

export default App;