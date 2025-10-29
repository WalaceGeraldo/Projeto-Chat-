import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ImageModal from './ImageModal';
import './ChatScreen.css';

const INACTIVITY_TIMEOUT = 60 * 1000;

function ChatScreen({ user, socket, onLogout }) {
  // --- Estados do Componente ---
  // eslint-disable-next-line no-unused-vars
  const [activeChannel, setActiveChannel] = useState({ id: 1, name: 'Geral' });
  const [onlineUsersList, setOnlineUsersList] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isIdle, setIsIdle] = useState(false);
  const inactivityTimerRef = useRef(null);
  const [modalImage, setModalImage] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false); // Mantido para simular loading

  const activeChannelRef = useRef(activeChannel);
  useEffect(() => {
      activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  // --- Funções de Modal ---
  const openImageModal = useCallback((imageUrl) => {
      setModalImage(imageUrl);
  }, []);

  const closeImageModal = useCallback(() => {
      setModalImage(null);
  }, []);
  // -------------------------

  // --- Lógica de Detecção de Inatividade ---
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    setIsIdle(prevIsIdle => {
        if (prevIsIdle && socket) {
            socket.emit('userActive');
            return false;
        }
        return prevIsIdle;
    });
    
    inactivityTimerRef.current = setTimeout(() => {
        setIsIdle(true);
        if (socket) {
            socket.emit('userInactive');
        }
    }, INACTIVITY_TIMEOUT);
    
  }, [socket, setIsIdle]);

  useEffect(() => {
    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    activityEvents.forEach(event => window.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, resetInactivityTimer));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);


  // --- useEffect Principal para Listeners do Socket ---
  useEffect(() => {
    if (socket) {
      
      const incrementUnread = (conversationId) => {
          const currentActive = activeChannelRef.current;
          let currentConversationId;
          if (currentActive.type === 'dm') {
              currentConversationId = 'dm-' + currentActive.id;
          } else {
              currentConversationId = currentActive.id || currentActive.name;
          }

          if (conversationId !== currentConversationId) {
                setUnreadCounts(prev => ({ ...prev, [conversationId]: (prev[conversationId] || 0) + 1 }));
          }
      };


      // Listener para mensagens de CANAL
      const channelMessageListener = (receivedMessage) => {
        const displayMessage = {
           ...receivedMessage,
           id: receivedMessage.timestamp + Math.random(),
           timestamp: new Date(receivedMessage.timestamp),
           type: receivedMessage.type,
           content: receivedMessage.content,
           caption: receivedMessage.caption,
           channel: receivedMessage.channel
        };
        setAllMessages((prev) => [...prev, displayMessage]);

        const channelId = receivedMessage.channelId || receivedMessage.channel;
        if (channelId) {
            incrementUnread(channelId);
        }
      };

      // Listener para mensagens PRIVADAS (DM)
      const privateMessageListener = (receivedMessage) => {
         const displayMessage = {
              ...receivedMessage,
              id: receivedMessage.timestamp + Math.random(),
              timestamp: new Date(receivedMessage.timestamp),
              type: receivedMessage.type,
              content: receivedMessage.content,
              caption: receivedMessage.caption,
              senderId: receivedMessage.senderId,
              recipientId: receivedMessage.recipientId,
         };
         setAllMessages((prev) => [...prev, displayMessage]);

        const dmConversationId = 'dm-' + receivedMessage.senderId;
        incrementUnread(dmConversationId);
      };

       // Listener para atualizar a LISTA DE USUÁRIOS online
       const updateUserListListener = (usersWithStatus) => {
           setOnlineUsersList(usersWithStatus);
       };

       // Listener de histórico (SIMULADO)
       const historyLoadedListener = (messages) => {
            console.log(`[History] Tela limpa para novo histórico (${messages.length} mensagens).`);
            setAllMessages([]); 
            setIsHistoryLoading(false); 
        };

      // Registra os listeners no socket
      socket.on('receiveMessage', channelMessageListener);
      socket.on('receivePrivateMessage', privateMessageListener);
      socket.on('updateUserList', updateUserListListener);
      socket.on('historyLoaded', historyLoadedListener);
      
      socket.emit('requestUserList');

      return () => {
        socket.off('receiveMessage', channelMessageListener);
        socket.off('receivePrivateMessage', privateMessageListener);
        socket.off('updateUserList', updateUserListListener);
        socket.off('historyLoaded', historyLoadedListener);
      };
    }
  }, [socket, user]);


  // --- Lógica de Simulação de Carregamento ao Mudar de Conversa ---
  useEffect(() => {
    if (socket && activeChannel) {
        setIsHistoryLoading(true);
        
        // Simulação de delay de carregamento e limpeza da tela
        setTimeout(() => {
             // 1. Emite o pedido de histórico (Backend responde com array vazio)
             socket.emit('requestHistory', { type: activeChannel.type, identifier: activeChannel.id || activeChannel.name });
        }, 300);
    }
  }, [socket, activeChannel]);


  // --- Função para Mudar de Canal/DM e Limpar Não Lidas ---
   const handleSelectChannel = (channelOrDm) => {
       setActiveChannel(channelOrDm);
       let conversationId;
       if (channelOrDm.type === 'dm') {
           conversationId = 'dm-' + channelOrDm.id;
       } else {
           conversationId = channelOrDm.id || channelOrDm.name;
       }
       setUnreadCounts(prev => {
            const newCounts = { ...prev };
            if (newCounts[conversationId]) {
                 newCounts[conversationId] = 0;
            }
            return newCounts;
       });
   };

   // Dados Simulados para Canais
   const simulatedData = {
        channels: [
          { id: 1, name: 'Geral' },
          { id: 2, name: 'Frontend' },
          { id: 3, name: 'Back-End' },
        ],
    };

   // Filtra Mensagens para Exibir na Janela Ativa
    const messagesToShow = allMessages.filter(msg => {
        if (!activeChannel || !socket) return false;
        if (activeChannel.type === 'dm') {
            return msg.type && (msg.type.includes('image') || msg.type === 'text') &&
                   ((msg.senderId === socket.id && msg.recipientId === activeChannel.id) ||
                    (msg.senderId === activeChannel.id && msg.recipientId === socket.id));
        } else {
            const channelIdentifier = activeChannel.id || activeChannel.name;
            const messageChannelIdentifier = msg.channelId || msg.channel;
            return msg.type && (msg.type.includes('image') || msg.type === 'text') && messageChannelIdentifier === channelIdentifier;
        }
    }).sort((a, b) => a.timestamp - b.timestamp);


  return (
    <div className="chat-screen-container">
      {isIdle && console.log(`Status de inatividade: Ausente`)} 
      
      <Sidebar
        currentUser={user}
        channels={simulatedData.channels}
        onlineUsers={onlineUsersList}
        activeChannel={activeChannel}
        onSelectChannel={handleSelectChannel}
        onLogout={onLogout}
        unreadCounts={unreadCounts}
      />
      <ChatWindow
        messagesToShow={messagesToShow}
        channel={activeChannel}
        currentUser={user}
        socket={socket}
        onImageClick={openImageModal}
        isHistoryLoading={isHistoryLoading}
      />

      {modalImage && (
        <ImageModal 
          imageUrl={modalImage} 
          onClose={closeImageModal} 
        />
      )}
    </div>
  );
}

export default ChatScreen;