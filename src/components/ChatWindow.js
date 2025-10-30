import React, { useState, useEffect, useRef } from 'react'; 
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { supabase } from '../supabaseClient'; 

// O componente não usa mais 'socket', e 'isHistoryLoading' deve ser recebido do ChatScreen
function ChatWindow({ channel, currentUser, onImageClick, messagesToShow, isHistoryLoading }) { 

  const messagesEndRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState([]);
  
  // NOTE: A lógica de tempo real e carregamento de histórico está no ChatScreen.js.


  // Efeito para rolar para o final da lista sempre que 'messagesToShow' mudar
  useEffect(() => {
    // CORREÇÃO FINAL PARA CHROME: 
    // Usamos setTimeout(0) para garantir que o scroll seja chamado após o ciclo de renderização,
    // garantindo que messagesEndRef.current não seja null.
    const scroll = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    // Chamamos o scroll no final da fila de eventos.
    setTimeout(scroll, 0); 
    
  }, [messagesToShow]);

  // --- Efeito para listeners de digitação (Simplificado/Removido o Socket.io) ---
  // Mantemos o estado typingUsers, mas removemos a lógica de socket.on aqui para a migração.
  useEffect(() => {
      // Limpa o estado de digitação ao trocar de canal
      return () => {
        setTypingUsers([]); 
      };
  }, [channel]);
  // ----------------------------------------------------------------------------------


  // --- FUNÇÃO handleSendMessage (Salva no Supabase Database) ---
  // Recebe (text, fileUrl, type) do MessageInput
  const handleSendMessage = async (text, fileUrl, type) => {
    
    // 1. Determina a estrutura da mensagem para o Supabase
    let messagePayload = {
      sender: currentUser,
      // Usamos 'channel_name' para filtrar mensagens, seja canal ou DM
      channel_name: channel.name, 
      content: fileUrl || text, // URL da mídia OU Texto puro
      type: type, 
    };

    // 2. Adiciona campos específicos (Caption)
    if (type === 'text-with-image' || type === 'audio') {
        // Se for imagem com texto ou áudio, o 'text' é a legenda
        messagePayload.caption = text;
        // Se for apenas mídia, content é o URL e caption é null/vazio.
        messagePayload.content = fileUrl; 
    }
    // Se for texto puro, content é o 'text' e caption não é enviado.

    // Remove campos nulos/vazios desnecessários para uma inserção mais limpa
    const cleanedPayload = Object.fromEntries(
        Object.entries(messagePayload).filter(([_, v]) => v !== null && v !== undefined)
    );
    
    // 3. Salva no Supabase
    try {
        const { error } = await supabase
            .from('messages') // Nome da tabela que você criou
            .insert([cleanedPayload]); // Insert recebe um array de objetos

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
    <main className="chat-window">
      <header className="chat-header">
        <h3>
          {channel?.type === 'dm' ? `@${channel.name}` : `#${channel?.name || 'Carregando...'}`}{/* Título com # ou @ */}
        </h3>
        <span className="channel-description">
          {channel?.type === 'dm' ? `Conversa com ${channel.name}` : `Tópico do canal #${channel?.name || ''}`}
        </span>
      </header>

      {/* --- Indicador de Carregamento --- */}
      {isHistoryLoading ? (
        <div className="history-loading-indicator">
          <i className="fas fa-spinner fa-spin"></i> 
          <p>Carregando histórico...</p>
        </div>
      ) : (
        /* Renderiza a lista de mensagens quando não está carregando */
        <div className="chat-messages-container">
            {chatContent}
            <div ref={messagesEndRef} /> {/* Ponto de âncora para o scroll */}
        </div>
      )}
      {/* ---------------------------------- */}
      
      {/* Exibe o indicador de digitação */}
      <div className="typing-indicator">
        {typingString && <span>{typingString}</span>} 
      </div>

      <MessageInput
        onSendMessage={handleSendMessage} // A função que salva no Supabase
        channelName={channel?.type === 'dm' ? channel.name : channel?.name}
        currentUser={currentUser}
        // socket removido
        activeChannel={channel}
      />
    </main>
  );
}

export default ChatWindow;