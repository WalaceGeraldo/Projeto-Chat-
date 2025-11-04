import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ImageModal from './ImageModal'; 
import './ChatScreen.css';
import { supabase } from '../supabaseClient'; 


function ChatScreen({ user, isReady, onLogout }) { 
  // --- Estados do Componente ---
  const [activeChannel, setActiveChannel] = useState({ id: 'Geral', name: 'Geral', type: 'channel' });
  const [onlineUsersList, setOnlineUsersList] = useState([]);
  const [allMessages, setAllMessages] = useState([]); 
  const [unreadCounts, setUnreadCounts] = useState({});
  const [modalImage, setModalImage] = useState(null); 
  const [isHistoryLoading, setIsHistoryLoading] = useState(false); 

  const activeChannelRef = useRef(activeChannel);
  useEffect(() => {
      activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  // --- Funções de Modal e Inatividade (Mantidas) ---
  const openImageModal = useCallback((imageUrl) => { setModalImage(imageUrl); }, []);
  const closeImageModal = useCallback(() => { setModalImage(null); }, []);
  const resetInactivityTimer = useCallback(() => { /* ... */ }, []); 
  useEffect(() => { /* ... */ }, [resetInactivityTimer]);

  // Função auxiliar para formatar a mensagem (usada no fetchMessages)
  const formatFetchedMessage = (msg) => ({
      id: msg.id,
      sender: msg.sender, 
      channel_name: msg.channel_name,
      content: msg.content,
      type: msg.type,
      caption: msg.caption,
      timestamp: new Date(msg.created_at || msg.timestamp), 
  });

  // --- FUNÇÃO CRÍTICA: CALCULA O NOME CANÔNICO DO CANAL/DM ---
  const getConversationId = useCallback((channel) => {
    if (channel.type === 'dm') {
        const users = [user, channel.name].sort();
        return `DM_${users[0]}_${users[1]}`;
    }
    return channel.name;
  }, [user]);

  // --- FUNÇÃO DE REALTIME: Recebe Nova Mensagem ---
  const handleNewMessage = useCallback((newMessageData) => {
    
    // Console.log para depuração 
    console.log("[Realtime OK] Evento Recebido:", newMessageData);
    
    const formattedMessage = {
        id: newMessageData.id,
        sender: newMessageData.sender || 'Desconhecido', 
        channel_name: newMessageData.channel_name,
        content: newMessageData.content,
        type: newMessageData.type,
        caption: newMessageData.caption,
        timestamp: new Date(newMessageData.created_at || Date.now()),
    };

    // Adiciona a mensagem ao estado global
    setAllMessages(prevMessages => [...prevMessages, formattedMessage]);

    // Lógica de Contador de Não Lidas
    if (formattedMessage.channel_name !== activeChannelRef.current.name && formattedMessage.sender !== user) {
        const conversationId = formattedMessage.channel_name;
        setUnreadCounts(prevCounts => ({
            ...prevCounts,
            [conversationId]: (prevCounts[conversationId] || 0) + 1
        }));
    }
  }, [user]);


  // --- FUNÇÃO: BUSCAR MENSAGENS NO SUPABASE (HISTÓRICO) ---
  const fetchMessages = useCallback(async (channelObj) => {
      setIsHistoryLoading(true);
      
      try {
          const conversationId = getConversationId(channelObj); 
          
          const { data: messagesData, error: fetchError } = await supabase
            .from('messages')
            .select(`*`) 
            .eq('channel_name', conversationId)
            .order('created_at', { ascending: true })
            .limit(500);

          if (fetchError) {
              throw fetchError; 
          }

          const formattedMessages = messagesData.map(formatFetchedMessage);

          return formattedMessages;
          
      } catch (e) {
          console.error("ERRO CRÍTICO no carregamento de histórico (Timeout/Permissão):", e);
          return [];
      } finally {
          // CRÍTICO: Garante que o estado de loading SEMPRE seja DESATIVADO
          setIsHistoryLoading(false);
      }
  }, [getConversationId]);


  // ======================================================================
  // --- EFEITO 1: CARREGAR HISTÓRICO E REALTIME DE MENSAGENS (CORRIGIDO) ---
  // ======================================================================
  useEffect(() => {
    
    // Função Assíncrona para Histórico (chamada interna do useEffect)
    const fetchHistory = async () => {
        const history = await fetchMessages(activeChannel); 
        setAllMessages(history);
    };
    
    let messageSubscription; 
    const conversationId = getConversationId(activeChannel);

    if (isReady && conversationId) {
        // 1a. Carrega o Histórico
        fetchHistory();
        
        // 2. Configura a Subscrição do Realtime
        messageSubscription = supabase
            .channel(`messages-${conversationId}`) 
            .on(
                'postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'messages',
                    filter: `channel_name=eq.${conversationId}`,
                },
                (payload) => {
                    handleNewMessage(payload.new);
                }
            )
            .subscribe((status, error) => {
                 if (status === 'CHANNEL_ERROR') {
                     console.error("Erro no Canal Realtime:", error);
                 }
            }); 
    }

    // Limpeza: Remove a inscrição ao trocar de canal ou desmontar
    return () => {
        // CRÍTICO: Limpeza síncrona que resolve o race condition de limpeza.
        if (messageSubscription) {
            supabase.removeChannel(messageSubscription);
        }
    };
    
  }, [activeChannel, isReady, handleNewMessage, getConversationId, fetchMessages]); 
  // ======================================================================


  // ======================================================================
  // --- EFEITO 2: GERENCIAMENTO DE PRESENÇA (FIXO no canal #Geral) ---
  // ======================================================================
  useEffect(() => {
    if (!isReady || !user) return;
    
    const PRESENCE_CHANNEL_NAME = 'Geral'; 
    let presenceChannel;

    const userPresence = { 
        username: user, 
        online_at: new Date().toISOString(),
        channel: PRESENCE_CHANNEL_NAME 
    };
    
    // Cria o canal de presença
    presenceChannel = supabase.channel(`presence-${PRESENCE_CHANNEL_NAME}`, {
        config: {
            presence: { key: user } 
        }
    });
    
    // Ouve eventos de Presença
    presenceChannel.on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        
        const onlineUsers = Object.keys(newState).map(key => {
            const userState = newState[key][0];
            return {
                id: userState.username,
                name: userState.username,
                status: 'online'
            };
        }).filter(onlineUser => onlineUser.name !== user);
        
        setOnlineUsersList(onlineUsers); 
    });

    // Assina e Envia o Estado Inicial de Presença
    presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await presenceChannel.track(userPresence);
        }
    });
        
    // Limpeza: Roda apenas quando o componente ChatScreen é desmontado (logout)
    return () => {
        if (presenceChannel) {
            // CRÍTICO: O untrack() é assíncrono, mas a remoção do canal é mais segura após o untrack.
            presenceChannel.untrack().then(() => {
                supabase.removeChannel(presenceChannel);
            }).catch(e => console.error("Erro ao limpar canal de Presença:", e));
        }
    };
    
  }, [isReady, user, setOnlineUsersList]);
  // ======================================================================


  // Lógica para selecionar Canais
  const handleSelectChannel = (channelOrDm) => {
    const prevConversationId = getConversationId(activeChannel); 

    setUnreadCounts(prevCounts => ({
        ...prevCounts,
        [prevConversationId]: 0 
    }));

    setActiveChannel(channelOrDm); 
  };
   

  // --- Estrutura de Dados Simulada (para o Sidebar) ---
  const simulatedData = {
    channels: [
      { id: 'Geral', name: 'Geral', type: 'channel' },
      { id: 'Frontend', name: 'Frontend', type: 'channel' },
      { id: 'Backend', name: 'Back-End', type: 'channel' },
    ],
  };

  // Filtra Mensagens para Exibir na Janela Ativa
  const messagesToShow = allMessages.filter(msg => 
    msg.channel_name === getConversationId(activeChannel)
  ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());


  return (
    <div className="chat-screen-container">
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
        onImageClick={openImageModal} 
        isHistoryLoading={isHistoryLoading} 
      />
      
      {/* Modal de Imagem (Tela Cheia) */}
      {modalImage && (
        <ImageModal imageUrl={modalImage} onClose={closeImageModal} />
      )}
    </div>
  );
}

export default ChatScreen;