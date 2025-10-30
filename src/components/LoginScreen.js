import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // <-- Importação necessária

// O 'onLogin' agora receberá o nome do usuário/email para o estado em App.js
function LoginScreen({ onLogin }) {
  const [isLoginView, setIsLoginView] = useState(true); // Alterna entre Login e Registro
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Funções de Autenticação do Supabase ---

  // 1. REGISTRO (Sign Up)
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Opcional: Você pode adicionar dados de perfil aqui (ex: 'username')
        data: {
            username: email.split('@')[0], // Usa a parte inicial do email como username temporário
        }
      }
    });

    setLoading(false);

    if (error) {
      console.error("[Supabase] Erro no Registro:", error.message);
      setError(error.message);
      return;
    }
    
    // Se o registro for bem-sucedido, o Supabase envia um email de confirmação por padrão.
    // Dependendo da sua configuração, 'data.user' pode estar presente.
    if (data.user) {
        // Entra no chat automaticamente (para simular login instantâneo)
        // OBS: Em produção, você deve forçar a confirmação de email primeiro.
        onLogin(data.user.email); 
    } else {
        // Isso é comum se a confirmação de e-mail estiver habilitada.
        alert('Confira seu e-mail para validar sua conta antes de fazer login!');
    }
  };

  // 2. LOGIN (Sign In)
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error("[Supabase] Erro no Login:", error.message);
      setError(error.message);
      return;
    }

    if (data.user) {
      // O login foi bem-sucedido
      onLogin(data.user.email); // Passa o email do usuário logado para o App.js
    }
  };


  const handleSubmit = isLoginView ? handleSignIn : handleSignUp;

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>{isLoginView ? 'Entrar' : 'Criar Conta'} no Chat</h2>
        
        {/* Campo de Email */}
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
        
        {/* Campo de Senha */}
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

        {/* Mensagem de Erro */}
        {error && <p className="error-message" style={{color: '#dc3545', fontSize: '0.9em', marginBottom: '10px'}}>{error}</p>}
        
        {/* Botão Principal de Login/Registro */}
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
        // Usamos um estilo inline aqui, pois o CSS base do botão é para "Sair"
        style={{marginTop: '20px', background: 'none', color: '#007bff', border: 'none', padding: 0, fontSize: '1em'}}
      >
        {isLoginView 
          ? 'Não tem conta? Crie uma.' 
          : 'Já tem conta? Faça login.'}
      </button>
    </div>
  );
}

export default LoginScreen;