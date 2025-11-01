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


  // --- FUNÇÃO CRÍTICA: CALCULA O NOME CANÔNICO DO CANAL/DM ---
  const getConversationId = useCallback((channel) => {
    // Se for DM, cria um nome canônico (DM_UserA_UserB, em ordem alfabética)
    if (channel.type === 'dm') {
        const users = [user, channel.name].sort();
        return `DM_${users[0]}_${users[1]}`;
    }
    // Para canais públicos, usa o nome simples
    return channel.name;
  }, [user]);


  // Função auxiliar para formatar a mensagem
  const formatFetchedMessage = (msg) => ({
      id: msg.id,
      sender: msg.sender, 
      channel_name: msg.channel_name,
      content: msg.content,
      type: msg.type,
      caption: msg.caption,
      timestamp: new Date(msg.created_at || msg.timestamp), 
  });

  // --- FUNÇÃO DE REALTIME: Recebe Nova Mensagem ---
  const handleNewMessage = useCallback((newMessageData) => {
    
    // Console.log para depuração (Removível após teste)
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
    const currentConversationId = getConversationId(activeChannelRef.current);

    if (formattedMessage.channel_name !== currentConversationId && formattedMessage.sender !== user) {
        const conversationId = formattedMessage.channel_name; // O nome canônico já está no evento
        setUnreadCounts(prevCounts => ({
            ...prevCounts,
            [conversationId]: (prevCounts[conversationId] || 0) + 1
        }));
    }
  }, [user, getConversationId]); // Adicionada dependência getConversationId


  // --- FUNÇÃO CORRIGIDA: BUSCAR MENSAGENS NO SUPABASE (HISTÓRICO) ---
  const fetchMessages = useCallback(async (channelObj) => { // Recebe o objeto {name, type, ...}
      setIsHistoryLoading(true);
      
      // CRÍTICO: Usa a função auxiliar para obter o ID correto do canal/DM
      const conversationId = getConversationId(channelObj); 
      
      const { data: messagesData, error: fetchError } = await supabase
        .from('messages')
        .select(`*`) 
        .eq('channel_name', conversationId) // Usa o ID canônico
        .order('created_at', { ascending: true }); 

      if (fetchError) {
          console.error("Erro ao carregar histórico de mensagens:", fetchError);
          setIsHistoryLoading(false);
          return [];
      }

      const formattedMessages = messagesData.map(formatFetchedMessage);

      setIsHistoryLoading(false);
      return formattedMessages;
  }, [getConversationId]); // Adicionada dependência getConversationId
  
  
  // ======================================================================
  // --- EFEITO 1: CARREGAR HISTÓRICO E REALTIME DE MENSAGENS ---
  // ======================================================================
  useEffect(() => {
    
    // CRÍTICO: Calcula o ID da Conversa para Subscrição
    const conversationId = getConversationId(activeChannel); 

    const fetchHistory = async () => {
        // Passa o objeto activeChannel para fetchMessages
        const history = await fetchMessages(activeChannel); 
        setAllMessages(history);
    };
    
    let messageSubscription; 

    if (isReady && conversationId) {
        // 1a. Carrega o Histórico
        fetchHistory();
        
        // 2. Configura a Subscrição do Realtime
        messageSubscription = supabase
            .channel(`messages-${conversationId}`) // Usa o ID canônico no nome do canal Supabase
            .on(
                'postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'messages',
                    filter: `channel_name=eq.${conversationId}`, // Usa o ID canônico no filtro
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

    // Limpeza: Remove a inscrição
    return () => {
        if (messageSubscription) {
            supabase.removeChannel(messageSubscription);
        }
    };
    
  }, [activeChannel, isReady, fetchMessages, handleNewMessage, getConversationId]); 
  // ======================================================================


  // ======================================================================
  // --- EFEITO 2: GERENCIAMENTO DE PRESENÇA (FIXO no canal #Geral) ---
  // ======================================================================
  useEffect(() => {
    if (!isReady || !user) return;
    // ... (Código de Presença inalterado) ...
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
        
    // Limpeza
    return () => {
        if (presenceChannel) {
            presenceChannel.untrack(); 
            supabase.removeChannel(presenceChannel);
        }
    };
    
  }, [isReady, user, setOnlineUsersList]);
  // ======================================================================


  // Lógica para selecionar Canais
  const handleSelectChannel = (channelOrDm) => {
    // CRÍTICO: Usa getConversationId para obter o ID do canal/DM anterior para zerar as não lidas
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
    // CRÍTICO: Filtra as mensagens pelo ID canônico da conversa ativa
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