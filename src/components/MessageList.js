import React, { useRef, useEffect } from 'react';
import { useSignedUrl } from '../useSignedUrl'; // Importa o novo hook (Ajuste o caminho se necessário)


// Subcomponente que lida com o carregamento assíncrono da imagem/mídia
const MediaContent = ({ contentUrl, type, caption, onImageClick }) => {
    
    // O URL REST salvo é: YOUR_URL/storage/v1/object/public/chat-media/images/file.jpg
    // Precisamos da parte "images/file.jpg" (o caminho do arquivo no Storage)
    const urlParts = contentUrl.split('chat-media/');
    const filePath = urlParts.length > 1 ? urlParts[1] : null; 
    
    // 2. Usamos o hook para obter o URL assinado (que inclui o token)
    const signedUrl = useSignedUrl(filePath);

    // Placeholder de Carregamento
    if (!signedUrl) {
        return (
            <div className="media-placeholder" style={{ color: '#007bff', fontStyle: 'italic', padding: '10px 0' }}>
                {type.includes('image') ? 'Carregando Imagem...' : 'Carregando Mídia...'}
            </div>
        );
    }
    
    // Renderiza IMAGEM
    if (type.includes('image')) {
        return (
            <img 
                src={signedUrl} // Usa o URL temporário assinado
                alt={caption || "Imagem enviada"} 
                className="message-image" 
                onClick={() => onImageClick && onImageClick(signedUrl)} // Passa o URL assinado para o modal
            />
        );
    } 
    // Renderiza ÁUDIO
    else if (type === 'audio') {
        return (
            <audio controls src={signedUrl} className="message-audio-player">
                Seu navegador não suporta o elemento de áudio.
            </audio>
        );
    }
    return null;
};


// Componente principal MessageList
function MessageList({ messages, currentUser, onImageClick }) { 
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Função auxiliar para renderizar o conteúdo (agora chama MediaContent)
  const renderMediaContent = (msg) => {
      // Verifica se a mensagem tem um URL (se for imagem ou áudio)
      if ((msg.type.includes('image') || msg.type === 'audio') && msg.content) {
          return (
              <MediaContent
                  contentUrl={msg.content} // O URL REST que salvamos no DB
                  type={msg.type}
                  caption={msg.caption}
                  onImageClick={onImageClick}
              />
          );
      }
      return null;
  };
  

  return (
    <div className="message-list">
      {Array.isArray(messages) && messages.map((msg, index) => {
        // Validação básica do conteúdo.
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
              
              {/* NOVO: Chama o renderMediaContent que usa o hook assinado */}
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