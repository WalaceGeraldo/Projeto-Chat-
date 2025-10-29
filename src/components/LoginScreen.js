import React, { useState } from 'react';

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Entrar no Chat</h2>
        {/* Adicionado id e name abaixo */}
        <input
          type="text"
          id="username-input" // <-- Adicionado ID
          name="username"     // <-- Adicionado Name
          placeholder="Digite seu nome de usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}

export default LoginScreen;