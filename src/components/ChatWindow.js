import React, { useState, useEffect, useRef } from 'react'; 
import MessageList from './MessageList';
import MessageInput from './MessageInput';
// REMOVIDO: import io from 'socket.io-client'; // <-- Linha 4 corrigida: Remoção da importação não utilizada

// Recebe 'channel', 'currentUser', 'socket' e agora 'messagesToShow' (filtradas)
function ChatWindow({ channel, currentUser, socket, messagesToShow, onImageClick }) {

  // Referência para o último elemento da lista de mensagens (para scroll)
  const messagesEndRef = useRef(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false); 
  const [typingUsers, setTypingUsers] = useState([]);


  // ----------------------------------------------------
  // Efeito para solicitar histórico quando o canal mudar
  // ----------------------------------------------------
  useEffect(() => {
    if (!socket || !channel) return;

    // 1. Ativa o indicador de carregamento
    setIsHistoryLoading(true);

    // 2. Determina o identificador (nome para canais, ID de socket para DMs)
    const identifier = channel.type === 'dm' ? channel.id : channel.name;
    const requestData = { 
        type: channel.type, 
        identifier: identifier 
    };

    // 3. Envia a requisição de histórico
    socket.emit('requestHistory', requestData);
    console.log(`[Socket] Solicitando histórico para ${channel.type}: ${identifier}`);

    // 4. Ouve a resposta do histórico (tratada no ChatScreen, aqui apenas desativa o loading)
    const handleHistoryLoaded = (history) => {
        setIsHistoryLoading(false);
        console.log(`[Socket] Histórico recebido e carregamento finalizado para ${channel.name}.`);
    };

    socket.on('historyLoaded', handleHistoryLoaded);

    // Limpeza: Remove o listener quando o componente desmonta ou o canal muda
    return () => {
        socket.off('historyLoaded', handleHistoryLoaded);
    };
    
  }, [channel, socket]); 


  // Efeito para rolar para o final da lista sempre que 'messagesToShow' mudar
  useEffect(() => {
    if (messagesEndRef.current) {
        setTimeout(() => {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }, 10); 
    }
  }, [messagesToShow]);
  // ----------------------------------------------------

  // --- Efeito para listeners de digitação ---
  useEffect(() => {
    if (socket) {
      const getCurrentConversationId = () => {
          return channel?.type === 'dm' ? ('dm-' + channel.id) : (channel?.id || channel?.name);
      };

      const typingStartListener = (typingData) => {
          const currentConversationId = getCurrentConversationId();
          if (typingData.conversationId === currentConversationId && typingData.userName !== currentUser) {
              setTypingUsers(prev => prev.includes(typingData.userName) ? prev : [...prev, typingData.userName]);
          }
      };

      const typingStopListener = (typingData) => {
           const currentConversationId = getCurrentConversationId();
           if (typingData.conversationId === currentConversationId) {
               setTypingUsers(prev => prev.filter(name => name !== typingData.userName));
           }
      };

      socket.on('userTyping', typingStartListener);
      socket.on('userStoppedTy pin g', typingStopListener);

      return () => {
        socket.off('userTyping', typingStartListener);
        socket.off('userStoppedTy pin g', typingStopListener);
        setTypingUsers([]);
      };
    }
  }, [socket, channel, currentUser]);
  // ------------------------------------------


  // --- Função de Envio (Recebe texto, fileUrl e type) ---
  const handleSendMessage = (text, fileUrl, type) => {
    if (socket && channel) {
      const timestamp = new Date().toISOString();

      if (channel.type === 'dm') {
        const privateMessageData = {
          text: text,
          fileUrl: fileUrl, 
          type: type,       
          sender: currentUser,
          senderId: socket.id,
          recipientId: channel.id,
          recipientName: channel.name,
          timestamp: timestamp,
        };
        socket.emit('sendPrivateMessage', privateMessageData);
        console.log('DM Enviada:', privateMessageData);
      } else {
        const channelMessageData = {
          text: text,
          fileUrl: fileUrl, 
          type: type,       
          sender: currentUser,
          channel: channel.name, 
          timestamp: timestamp,
        };
        socket.emit('sendMessage', channelMessageData);
        console.log('Mensagem de Canal Enviada:', channelMessageData);
      }
    } else {
      console.error("Não foi possível enviar. Socket:", !!socket, "Canal:", channel, "Texto:", text);
    }
  };
  // --------------------------------------------------------------------------

  // Cria a string de quem está digitando
  const createTypingString = () => {
    const numTyping = typingUsers.length;
    if (numTyping === 0) return '';
    if (numTyping === 1) return `${typingUsers[0]} está digitando...`;
    if (numTyping === 2) return `${typingUsers[0]} e ${typingUsers[1]} estão digitando...`;
    return `Vários usuários estão digitando...`;
  };
  const typingString = createTypingString(); 


  // Conteúdo principal da janela de chat: loading ou lista de mensagens
  const chatContent = isHistoryLoading ? (
      <div className="history-loading-indicator">
          <i className="fas fa-spinner fa-spin"></i> 
          <p>Carregando histórico...</p>
      </div>
  ) : (
      // Repassa as props de clique de imagem e as mensagens
      <MessageList 
        messages={messagesToShow} 
        currentUser={currentUser} 
        onImageClick={onImageClick} 
      />
  );


  return (
    <main className="chat-window">
      <header className="chat-header">
        <h3>
          {channel?.type === 'dm' ? `@${channel.name}` : `#${channel?.name || 'Carregando...'}`}{/* Título com # ou @ */}
        </h3>
        <span className="channel-description">
          {channel?.type === 'dm' ? `Conversa com ${channel.name}` : `Tópico do canal #${channel?.name || ''}`}
        </span>
      </header>

      {/* Renderiza o conteúdo do chat (lista ou loading) */}
      <div className="chat-messages-container">
          {chatContent}
      </div>
      
      {/* Exibe o indicador de digitação */}
      <div className="typing-indicator">
        {typingString && <span>{typingString}</span>} 
      </div>

      {/* O Input usa o channel para o placeholder e passa a função de envio */}
      <MessageInput
        onSendMessage={handleSendMessage} // Agora espera 3 parâmetros: (text, fileUrl, type)
        channelName={channel?.type === 'dm' ? channel.name : channel?.name}
        currentUser={currentUser}
        socket={socket}
        activeChannel={channel}
      />
    </main>
  );
}

export default ChatWindow;