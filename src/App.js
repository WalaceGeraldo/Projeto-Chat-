import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen'; // <-- IMPORTAÇÃO ADICIONADA
import './App.css';
import io from 'socket.io-client'; // Importar o cliente io

// Definir o endereço do backend
const SOCKET_SERVER_URL = "http://localhost:4000";

function App() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null); // Estado para guardar a conexão do socket

  // Efeito para conectar/desconectar
  useEffect(() => {
    let newSocket; // Variável para guardar o socket criado neste efeito

    // Se o usuário está logado (user existe)
    if (user) {
      console.log("Tentando conectar ao servidor Socket.io...");
      // Cria a conexão SÓ SE o usuário estiver logado
      newSocket = io(SOCKET_SERVER_URL);

      newSocket.on('connect', () => {
        console.log(`Conectado ao servidor Socket.io com ID: ${newSocket.id}`);
        setSocket(newSocket); // Guarda a conexão estabelecida no estado
        // Envia o nome de usuário para o servidor após conectar
        newSocket.emit('userLoggedIn', user);
        console.log(`Enviando login para o servidor: ${user}`);
      });

      // Lidar com erro de conexão
      newSocket.on('connect_error', (err) => {
        console.error("Erro ao conectar ao Socket.io:", err.message);
        setSocket(null); // Garante que o estado reflita a falha na conexão
      });

      // Lidar com desconexão inesperada do servidor
      newSocket.on('disconnect', (reason) => {
        console.log(`Desconectado do servidor: ${reason}`);
        setSocket(null); // Limpa o estado do socket se a conexão cair
        // Opcional: Deslogar o usuário se a conexão cair
        // setUser(null);
      });

    }
    // Se não há usuário logado, não fazemos nada aqui (a limpeza cuidará da desconexão)

    // Função de limpeza: será chamada ANTES de rodar o efeito novamente (se 'user' mudar)
    // ou quando o componente App for desmontado.
    return () => {
      // Se existia uma conexão ('newSocket' foi criada nesta execução do efeito)
      if (newSocket) {
        console.log("Limpando e desconectando socket ao sair ou deslogar...");
        newSocket.disconnect();
        // Limpar o estado do socket aqui também garante que ele fique nulo ao deslogar
        setSocket(null);
      }
    };

    // A lista de dependências AGORA SÓ TEM 'user'.
    // O efeito só vai rodar novamente se o 'user' mudar (login/logout).
  }, [user]);

  // Função chamada pelo LoginScreen
  const handleLogin = (username) => {
    setUser(username); // Define o usuário, disparando o useEffect para conectar
  };

  // Função chamada pelo ChatScreen (botão Sair)
  const handleLogout = () => {
    setUser(null); // Define usuário como null, disparando a limpeza do useEffect para desconectar
  };

  return (
    <div className="App">
      {/* Se não há usuário, mostra LoginScreen, passando a função handleLogin */}
      {!user ? (
        <LoginScreen onLogin={handleLogin} /> // <-- Garante que onLogin está aqui
      ) : (
        /* Se há usuário, mostra ChatScreen, passando o usuário e a conexão do socket */
        <ChatScreen user={user} socket={socket} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;