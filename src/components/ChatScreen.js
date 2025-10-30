import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ImageModal from './ImageModal'; 
import './ChatScreen.css';
import { supabase } from '../supabaseClient'; // <-- Mantenha a importação do Supabase

// --- REMOVIDO: Não há mais imports do Firebase aqui ---

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

  // --- Funções de Modal (Implementação simplificada) ---
  const openImageModal = useCallback((imageUrl) => { setModalImage(imageUrl); }, []);
  const closeImageModal = useCallback(() => { setModalImage(null); }, []);

  // --- Lógica de Inatividade (Simplificada/Removida a dependência do socket) ---
  const resetInactivityTimer = useCallback(() => { /* ... */ }, []); 
  useEffect(() => { /* ... */ }, [resetInactivityTimer]);

  // Função auxiliar para formatar a mensagem do Supabase
  const formatSupabaseMessage = (message) => ({
      ...message,
      id: message.id, 
      // O 'created_at' do Supabase já é uma string de data válida
      timestamp: new Date(message.created_at), 
      type: message.type || 'text',
      content: message.content || message.caption, // Prioriza o 'content' ou 'caption'
  });


  // --- NOVO useEffect: LISTENERS DO SUPABASE REALTIME ---
  useEffect(() => {
    if (!isReady) {
      setIsHistoryLoading(true); 
      return;
    }

    setIsHistoryLoading(true); 
    const channelName = activeChannel.name; 
    let realTimeSubscription = null;

    // 1. FUNÇÃO PARA CARREGAR O HISTÓRICO INICIAL
    const fetchInitialHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('channel_name', channelName) // Filtra pelo nome do canal ativo
                .order('created_at', { ascending: true }); // Ordena por data
            
            if (error) throw error;
            
            const initialMessages = data.map(formatSupabaseMessage);
            setAllMessages(initialMessages);
            setIsHistoryLoading(false);
            console.log(`[Supabase] Histórico inicial de ${channelName} carregado.`);
        } catch (error) {
            console.error("[Supabase] Erro ao carregar histórico:", error.message);
            setIsHistoryLoading(false);
        }
    };
    
    // 2. FUNÇÃO PARA INSCREVER-SE EM TEMPO REAL
    const subscribeToRealtime = () => {
        // Remove a inscrição anterior, se houver
        if (realTimeSubscription) {
            supabase.removeChannel(realTimeSubscription);
        }

        console.log(`[Supabase Realtime] Iniciando escuta em tempo real para: ${channelName}`);

        realTimeSubscription = supabase
            .channel('chat-changes') // Nome do canal Realtime
            .on(
                'postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'messages',
                    filter: `channel_name=eq.${channelName}`, // Filtra apenas mensagens do canal atual
                },
                (payload) => {
                    const newMessage = formatSupabaseMessage(payload.new);
                    console.log("[Supabase Realtime] Nova mensagem recebida:", newMessage);

                    // Adiciona a nova mensagem ao estado
                    setAllMessages(prevMessages => {
                        const conversationId = activeChannelRef.current.name; 

                        // Lógica para detectar e contar novas mensagens (se não for do usuário atual)
                        if (newMessage.sender !== user) {
                            setUnreadCounts(prevCounts => ({
                                ...prevCounts,
                                [conversationId]: (prevCounts[conversationId] || 0) + 1 
                            }));
                        }
                        
                        return [...prevMessages, newMessage];
                    });
                }
            )
            .subscribe(); // Inicia a escuta

    };

    // Executa as funções
    fetchInitialHistory();
    subscribeToRealtime();
    
    // 3. Simulação da Lista de Usuários Online (ainda simulado, pois a implementação nativa é complexa)
    const users = [
        { id: 'Ana@exemplo.com', name: 'Ana', status: 'online' }, 
        { id: 'Bruno@exemplo.com', name: 'Bruno', status: 'online' },
        { id: 'Carlos@exemplo.com', name: 'Carlos', status: 'idle' },
    ];
    setOnlineUsersList(users.filter(u => u.id !== user).map(u => ({...u, id: u.id, name: u.id})));
    
    // 4. Limpeza: Remove o listener do Supabase ao desmontar/mudar de canal
    return () => {
        if (realTimeSubscription) {
            supabase.removeChannel(realTimeSubscription); 
        }
    };
  // ATENÇÃO: A dependência 'user' garante que o Realtime reinicie se o usuário mudar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel.name, user, isReady]); 


  // --- Função para Mudar de Canal/DM e Limpar Não Lidas ---
  const handleSelectChannel = (channelOrDm) => {
    // Limpa as mensagens não lidas para o canal anterior
    const prevConversationId = activeChannel.name;
    
    setUnreadCounts(prevCounts => ({
        ...prevCounts,
        [prevConversationId]: 0 
    }));

    // Define o novo canal ativo
    setActiveChannel(channelOrDm);
    // Força o recarregamento do histórico
    setAllMessages([]);
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
    msg.channel_name === activeChannel.name
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