import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 
// Ícones do Font Awesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons'; 


function LoginScreen({ onLogin }) {
  const [isLoginView, setIsLoginView] = useState(true); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Efeito para verificar sessão existente (se o usuário voltou de um OAuth) ---
  // Este efeito é CRUCIAL para capturar o usuário após o redirecionamento do Google
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Se houver sessão, faz o login (usa o e-mail do usuário como nome)
        // Nota: O 'user.email' só existe se o Google Auth estiver configurado
        onLogin(session.user.email || session.user.id); 
      }
    });

    // Adiciona um listener para mudanças de estado de autenticação (ex: após login com Google)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Quando o usuário faz login (inclusive via Google), notifica o App.js
          onLogin(session.user.email || session.user.id);
        }
      }
    );

    // Limpeza: remove o listener ao desmontar
    return () => {
      authListener?.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executa apenas na montagem


  // --- FUNÇÃO DE LOGIN/REGISTRO POR E-MAIL/SENHA ---
  const handleAuth = async (isLogin) => {
    setLoading(true);
    setError(null);
    
    let result;
    if (isLogin) {
        // LOGIN (SIGN IN)
        result = await supabase.auth.signInWithPassword({ email, password });
    } else {
        // REGISTRO (SIGN UP)
        result = await supabase.auth.signUp({ email, password });
    }
    
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    
    // Se for registro, exibe aviso de confirmação. Se for login, chama onLogin.
    if (result.data.user) {
        onLogin(result.data.user.email); 
    } else {
        alert('Confira seu e-mail para validar sua conta antes de fazer login!');
    }
  };

  
  // --- FUNÇÃO DE LOGIN COM GOOGLE (OAuth) ---
  const handleGoogleLogin = async () => {
      setError(null);
      setLoading(true);
      
      // 1. Chama o método signInWithOAuth do Supabase
      const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
              // Redireciona de volta para a URL base do seu app
              redirectTo: window.location.origin, 
          }
      });

      setLoading(false);
      
      if (error) {
          console.error("[Supabase] Erro no Login com Google:", error);
          setError(error.message || "Falha ao iniciar login com Google.");
      }
      // O Supabase redirecionará o usuário para a página de login do Google.
  };
  // ------------------------------------


  return (
    <div className="login-container">
      
      {/* --- 1. BOTÃO DE LOGIN COM GOOGLE --- */}
      {/* Estilos inline para o botão do Google (melhor colocar no App.css) */}
      <button 
        type="button" 
        onClick={handleGoogleLogin} 
        className="google-login-button" 
        disabled={loading}
        style={{
            backgroundColor: '#4285F4', 
            color: 'white', 
            marginBottom: '20px', 
            padding: '12px 15px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            width: '100%',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '10px'
        }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = '#3367d6'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = '#4285F4'}
      >
        <FontAwesomeIcon icon={faGoogle} />
        {isLoginView ? 'Entrar com Google' : 'Registrar com Google'}
      </button>
      
      <div style={{textAlign: 'center', margin: '15px 0', color: '#888'}}>
        — OU —
      </div>

      {/* --- 2. FORMULÁRIO DE E-MAIL/SENHA --- */}
      <form onSubmit={(e) => { e.preventDefault(); handleAuth(isLoginView); }}>
        <h2>{isLoginView ? 'Entrar' : 'Criar Conta'}</h2>
        
        <input
          type="email"
          id="email-input"
          name="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        
        <input
          type="password"
          id="password-input"
          name="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        {error && <p className="error-message" style={{color: '#dc3545', fontSize: '0.9em', marginBottom: '10px'}}>{error}</p>}
        
        <button type="submit" disabled={loading}>
          {loading 
            ? <i className="fas fa-spinner fa-spin"></i> 
            : isLoginView ? 'Entrar' : 'Registrar'}
        </button>
      </form>

      {/* Botão de Alternância */}
      <button 
        onClick={() => setIsLoginView(prev => !prev)} 
        disabled={loading}
        style={{marginTop: '20px', background: 'none', color: '#007bff', border: 'none', padding: 0, fontSize: '1em', cursor: 'pointer'}}
      >
        {isLoginView 
          ? 'Não tem conta? Crie uma.' 
          : 'Já tem conta? Faça login.'}
      </button>
    </div>
  );
}

export default LoginScreen;