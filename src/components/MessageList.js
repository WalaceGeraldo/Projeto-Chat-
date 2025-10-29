import React, { useRef, useEffect } from 'react';

// Adicionado onImageClick aqui
function MessageList({ messages, currentUser, onImageClick }) { 
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {Array.isArray(messages) && messages.map((msg, index) => {
        if (!msg || !msg.type || !msg.content) {
            console.warn("Renderizando MessageList: Mensagem inválida encontrada:", msg);
            return null;
        }

        const isMe = msg.sender === currentUser;
        const previousMsg = index > 0 ? messages[index - 1] : null;
        const isSameSenderAsPrevious = previousMsg && (msg.sender === previousMsg.sender);

        const formattedTimestamp = msg.timestamp instanceof Date
            ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';


        return (
          <div
            key={msg.id || `msg-${index}`}
            className={`message-item ${isMe ? 'my-message' : 'other-message'} ${isSameSenderAsPrevious ? 'consecutive' : ''}`}
          >
            {!isMe && !isSameSenderAsPrevious && (
              <span className="message-sender">{msg.sender}</span>
            )}
            <div className="message-content">
              
              {(msg.type === 'image' || msg.type === 'text-with-image') && (
                <img 
                  src={msg.content} 
                  alt={msg.caption || "Imagem enviada"} 
                  className="message-image" 
                  // --- AÇÃO NO CLIQUE DA IMAGEM: Chama a função onImageClick com a URL ---
                  onClick={() => onImageClick && onImageClick(msg.content)} 
                  // ----------------------------------------------------------------------
                />
              )}
              
              {msg.type === 'text' && (
                <p className="message-text">{msg.content}</p>
              )}

              {msg.type === 'text-with-image' && msg.caption && (
                <p className="message-text message-caption">{msg.caption}</p>
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