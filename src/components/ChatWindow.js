import React, { useState, useEffect, useRef } from 'react'; 
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { supabase } from '../supabaseClient'; 

// O componente não usa mais 'socket', e 'isHistoryLoading' deve ser recebido do ChatScreen
function ChatWindow({ channel, currentUser, onImageClick, messagesToShow, isHistoryLoading }) { 

  const messagesEndRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState([]);
  
  // Efeito para rolar para o final da lista sempre que 'messagesToShow' mudar
  useEffect(() => {
    // CORREÇÃO: Usamos setTimeout(0) para garantir que o scroll seja chamado após o ciclo de renderização.
    const scroll = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    setTimeout(scroll, 0); 
    
  }, [messagesToShow]);

  // --- Efeito para listeners de digitação (Simplificado/Removido o Socket.io) ---
  useEffect(() => {
      // Limpa o estado de digitação ao trocar de canal
      return () => {
        setTypingUsers([]); 
      };
  }, [channel]);
  // ----------------------------------------------------------------------------------


  // --- FUNÇÃO handleSendMessage (Salva no Supabase Database) ---
  const handleSendMessage = async (text, fileUrl, type) => {
    
    // 1. Determina a estrutura da mensagem para o Supabase
    let messagePayload = {
      sender: currentUser,
      channel_name: channel.name, 
      content: fileUrl || text, 
      type: type, 
    };

    // 2. Adiciona campos específicos (Caption)
    if (type === 'text-with-image' || type === 'audio') {
        messagePayload.caption = text;
        messagePayload.content = fileUrl; 
    }
    
    // Remove campos nulos/vazios desnecessários para uma inserção mais limpa
    const cleanedPayload = Object.fromEntries(
        Object.entries(messagePayload).filter(([_, v]) => v !== null && v !== undefined)
    );
    
    // 3. Salva no Supabase
    try {
        const { error } = await supabase
            .from('messages') 
            .insert([cleanedPayload]);

        if (error) {
            throw error;
        }

        console.log(`[Supabase] Mensagem do tipo ${type} salva com sucesso.`);
    } catch (error) {
        console.error("[Supabase] Erro ao enviar mensagem:", error);
        alert(`Erro ao enviar mensagem para o chat: ${error.message}.`);
    }
    
  };
  // --------------------------------------------------------------------------

  // Cria a string de quem está digitando
  const createTypingString = () => {
    const numTyping = typingUsers.length;
    if (numTyping === 0) return '';
    if (numTyping === 1) return `${typingUsers[0]} está digitando...`;
    return `Vários usuários estão digitando...`;
  };
  const typingString = createTypingString(); 


  // Conteúdo principal da janela de chat: lista de mensagens
  const chatContent = (
      // Repassa as props de clique de imagem e as mensagens
      <MessageList 
        messages={messagesToShow}
        currentUser={currentUser} 
        onImageClick={onImageClick} 
      />
  );


  return (
    // A classe .chat-window deve ter display: flex e flex-direction: column (definido no CSS)
    <main className="chat-window"> 
      <header className="chat-header">
        <h3>
          {channel?.type === 'dm' ? `@${channel.name}` : `#${channel?.name || 'Carregando...'}`}
        </h3>
        <span className="channel-description">
          {channel?.type === 'dm' ? `Conversa com ${channel.name}` : `Tópico do canal #${channel?.name || ''}`}
        </span>
      </header>

      {/* --- Seção de Conteúdo/Lista de Mensagens --- */}
      {isHistoryLoading ? (
        <div className="history-loading-indicator">
          <i className="fas fa-spinner fa-spin"></i> 
          <p>Carregando histórico...</p>
        </div>
      ) : (
        /* O chat-messages-container deve ter flex-grow: 1 implicitamente ou o message-list deve ter */
        <div className="chat-messages-container"> 
            {chatContent}
            <div ref={messagesEndRef} /> 
        </div>
      )}
      {/* ---------------------------------- */}
      
      {/* Exibe o indicador de digitação */}
      <div className="typing-indicator">
        {typingString && <span>{typingString}</span>} 
      </div>

      {/* O MessageInput DEVE ser o último filho do <main> */}
      <MessageInput
        onSendMessage={handleSendMessage} 
        channelName={channel?.type === 'dm' ? channel.name : channel?.name}
        currentUser={currentUser}
        activeChannel={channel}
      />
    </main>
  );
}

export default ChatWindow;