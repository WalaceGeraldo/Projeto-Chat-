import React, { useRef, useEffect } from 'react';

// Adicionado onImageClick aqui
function MessageList({ messages, currentUser, onImageClick }) { 
  const messagesEndRef = useRef(null);

  // Efeito para rolar para a última mensagem
  useEffect(() => {
    // CORREÇÃO: Usamos verificação explícita.
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Função auxiliar para renderizar o conteúdo de mídia (imagem ou áudio)
  const renderMediaContent = (msg) => {
      // 1. Renderiza IMAGEM (com ou sem texto)
      if (msg.type === 'image' || msg.type === 'text-with-image') {
          return (
              <img 
                  src={msg.content} 
                  alt={msg.caption || "Imagem enviada"} 
                  className="message-image" 
                  onClick={() => onImageClick && onImageClick(msg.content)} 
              />
          );
      } 
      // 2. Renderiza ÁUDIO
      else if (msg.type === 'audio' && msg.content) {
          return (
              // O elemento 'controls' é essencial para mostrar o player de áudio
              <audio controls src={msg.content} className="message-audio-player">
                  Seu navegador não suporta o elemento de áudio.
              </audio>
          );
      }
      return null;
  };

  return (
    <div className="message-list">
      {Array.isArray(messages) && messages.map((msg, index) => {
        // Validação básica do conteúdo. Agora verificamos 'content' ou 'caption'.
        if (!msg || !msg.type || (!msg.content && !msg.caption)) {
            console.warn("Renderizando MessageList: Mensagem inválida encontrada:", msg);
            return null;
        }

        const isMe = msg.sender === currentUser;
        const previousMsg = index > 0 ? messages[index - 1] : null;
        const isSameSenderAsPrevious = previousMsg && (msg.sender === previousMsg.sender);

        const formattedTimestamp = msg.timestamp instanceof Date
            ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';

        // Condição para exibir TEXTO/LEGENDA:
        // Se for TEXTO PURO (type='text') OU se for uma mensagem com legenda (image/audio)
        const shouldRenderText = (msg.type === 'text') || (msg.type.includes('image') && msg.caption) || (msg.type === 'audio' && msg.caption);


        return (
          <div
            key={msg.id || `msg-${index}`}
            className={`message-item ${isMe ? 'my-message' : 'other-message'} ${isSameSenderAsPrevious ? 'consecutive' : ''}`}
          >
            {!isMe && !isSameSenderAsPrevious && (
              <span className="message-sender">{msg.sender}</span>
            )}
            <div className="message-content">
              
              {/* Renderiza Mídia (Imagem ou Áudio) */}
              {renderMediaContent(msg)}
              
              {/* Renderiza o Texto/Legenda */}
              {shouldRenderText && (
                  <p 
                      className={`message-text ${msg.type.includes('image') || msg.type === 'audio' ? 'message-caption' : ''}`}
                  >
                      {/* Se for mídia, usa caption; se for texto puro, usa content */}
                      {msg.type.includes('image') || msg.type === 'audio' ? msg.caption : msg.content}
                  </p>
              )}
              
              <span className="message-timestamp">{formattedTimestamp}</span>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;