
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function OnboardingScreen({ user, onProfileUpdated }) {
  // 'user' aqui é o objeto do Supabase Auth (possui o ID do usuário)
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    const trimmedUsername = newUsername.trim();

    if (trimmedUsername.length < 3) {
      setError('O nome de usuário deve ter pelo menos 3 caracteres.');
      return;
    }
    
    setIsLoading(true);

    // 1. Verificar se o nome de usuário já está em uso (na tabela 'profiles')
    const { count: countExisting, error: errorCheck } = await supabase
        .from('profiles')
        .select('username', { count: 'exact', head: true })
        .eq('username', trimmedUsername);

    if (errorCheck) {
        console.error('Erro ao verificar nome de usuário:', errorCheck);
        setError('Ocorreu um erro ao verificar o nome. Tente novamente.');
        setIsLoading(false);
        return;
    }

    if (countExisting > 0) {
        setError('Este nome de usuário já está em uso. Por favor, escolha outro.');
        setIsLoading(false);
        return;
    }

    // 2. Atualizar o perfil do usuário
    // O RLS (Política de UPDATE) que você configurou permite essa ação.
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: trimmedUsername })
      .eq('id', user.id); // Usa o ID do Auth para garantir que o RLS funcione

    setIsLoading(false);

    if (updateError) {
      console.error('Erro ao atualizar perfil:', updateError);
      setError('Não foi possível salvar o nome de usuário. Tente novamente.');
    } else {
      // 3. Sucesso: Chamar a função de callback para atualizar o estado no App.js
      onProfileUpdated(trimmedUsername);
    }
  };

  return (
    <div className="login-container onboarding-container">
      <form onSubmit={handleUpdate}>
        <h2>Definir Nome de Exibição</h2>
        <p>Parece que você acabou de se registrar. Por favor, escolha um nome de usuário que será exibido no chat.</p>

        <input
          type="text"
          placeholder="Seu Nome de Usuário"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          disabled={isLoading}
        />
        
        {error && <p className="error-message">{error}</p>}
        
        <button type="submit" disabled={isLoading || newUsername.trim().length < 3}>
          {isLoading ? 'Salvando...' : 'Salvar e Continuar'}
        </button>
      </form>
    </div>
  );
}

export default OnboardingScreen;