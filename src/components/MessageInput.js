import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react'; 

// Variável global para armazenar a instância do MediaRecorder
let mediaRecorder = null; 

// Recebe props adicionais para upload e controle de digitação
function MessageInput({ onSendMessage, channelName, currentUser, socket, activeChannel }) {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null); 
  const [isUploading, setIsUploading] = useState(false); 

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); 

  // --- ESTADOS PARA GRAVAÇÃO DE ÁUDIO ---
  const [isRecording, setIsRecording] = useState(false); 
  const [audioChunks, setAudioChunks] = useState([]);   
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null); 
  const [audioBlob, setAudioBlob] = useState(null); 
  // ----------------------------------------


  // Efeito de Limpeza: Revoga URLs temporárias do navegador ao limpar
  useEffect(() => {
    return () => {
        if (previewUrl) { URL.revokeObjectURL(previewUrl); }
        if (recordedAudioUrl) { URL.revokeObjectURL(recordedAudioUrl); } 
    };
  }, [previewUrl, recordedAudioUrl]);


  // Função para emitir evento de digitação
  const emitTypingEvent = (eventType) => {
    if (socket && activeChannel) {
      const typingData = {
        userId: socket.id,
        userName: currentUser,
        conversationId: activeChannel.type === 'dm' ? ('dm-' + activeChannel.id) : (activeChannel.id || activeChannel.name),
        isDM: activeChannel.type === 'dm',
        recipientId: activeChannel.type === 'dm' ? activeChannel.id : null
      };
      socket.emit(eventType, typingData);
    }
  };

  // Efeito para detectar início/fim da digitação (inclui todas as mídias)
  useEffect(() => {
    const isTyping = text.trim().length > 0 || selectedFile || recordedAudioUrl;
    
    if (isTyping) {
      emitTypingEvent('typingStart');
      if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); }
      typingTimeoutRef.current = setTimeout(() => {
        emitTypingEvent('typingStop');
      }, 1500); 
    } else if (typingTimeoutRef.current) {
       emitTypingEvent('typingStop');
       clearTimeout(typingTimeoutRef.current);
       typingTimeoutRef.current = null;
    }

    return () => {
      if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, selectedFile, recordedAudioUrl, socket, activeChannel, currentUser]); 


  // --- FUNÇÃO DE LIMPEZA GERAL DE INPUTS (e revogar URL) ---
  const clearInputs = () => {
    setText('');
    setSelectedFile(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    if (recordedAudioUrl) { URL.revokeObjectURL(recordedAudioUrl); setRecordedAudioUrl(null); }
    setAudioBlob(null);
    setAudioChunks([]);
    // Garante que o input de arquivo esteja limpo no DOM (para imagens)
    if(fileInputRef.current) { fileInputRef.current.value = ''; }
  };


  // Função para lidar com a seleção de arquivo (apenas imagem)
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem.');
        return;
    }

    if (previewUrl) { URL.revokeObjectURL(previewUrl); }
    // Limpa áudio se for selecionada imagem
    if (recordedAudioUrl) { clearInputs(); } 

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    
    event.target.value = '';
  };


  // --- Lógica de Gravação de Áudio ---
  const startRecording = async () => {
    clearInputs(); // Limpa tudo antes de começar a gravar
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Cria o MediaRecorder (com o tipo suportado pelo backend: audio/webm)
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorder.ondataavailable = (event) => {
        setAudioChunks(prev => [...prev, event.data]);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordedAudioUrl(audioUrl); 
        setAudioBlob(audioBlob);       
        setAudioChunks([]);            
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      console.log('Gravação de áudio iniciada.');
      
    } catch (err) {
      console.error('Erro ao acessar o microfone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      console.log('Gravação de áudio parada.');
    }
  };
  // ------------------------------------------


  // --- FUNÇÃO PRINCIPAL DE ENVIO (Unificada) ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    const canSend = text.trim().length > 0 || selectedFile || audioBlob;
    if (!canSend || isUploading || isRecording) return; 

    setIsUploading(true);

    let messageText = text.trim() || null;
    let fileUrl = null;
    let fileType = null;
    
    let fileToUpload = selectedFile || audioBlob;
    
    // 1. Lógica de Upload de Mídia (HTTP)
    if (fileToUpload) {
        const formData = new FormData();
        
        const fileName = fileToUpload instanceof Blob ? `audio-${Date.now()}.webm` : fileToUpload.name;
        // O nome do campo é 'mediaFile' (o backend espera isso)
        formData.append('mediaFile', fileToUpload, fileName); 

        try {
            const response = await fetch('http://localhost:4000/upload', {
                method: 'POST', body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || `Erro no upload: ${response.statusText}`);
            }

            const result = await response.json();
            fileUrl = result.fileUrl; 
            fileType = result.fileType; 
            
        } catch (error) {
            console.error("Falha no upload de mídia:", error);
            alert(`Erro ao enviar mídia: ${error.message}`);
            setIsUploading(false);
            return;
        }
    }

    // 2. Determina o Tipo de Mensagem para o Socket
    let type;
    if (fileType?.startsWith('audio')) {
        type = 'audio';
    } else if (fileType?.startsWith('image') && messageText) {
        type = 'text-with-image';
    } else if (fileType?.startsWith('image')) {
        type = 'image';
    } else {
        type = 'text'; 
    }

    // Envia a mensagem (texto, url, tipo) para o ChatWindow (e de lá para o socket)
    onSendMessage(
        messageText, 
        fileUrl, 
        type
    ); 

    // Limpeza após envio bem-sucedido
    clearInputs(); 
    setIsUploading(false);
    emitTypingEvent('typingStop');
  };

  const triggerFileInput = () => {
    // Limpa áudio gravado se for selecionar imagem
    if (recordedAudioUrl) { clearInputs(); }
    fileInputRef.current?.click();
  };
  
  const onEmojiClick = (emojiData) => {
    setText(prevText => prevText + emojiData.emoji);
    setShowEmojiPicker(false); 
  };


  const isDisabled = isUploading || isRecording || (!text.trim() && !selectedFile && !audioBlob);
  const showTextInput = !isRecording && !recordedAudioUrl;

  return (
    <div className="message-input-wrapper">
      
      {/* Seletor de Emojis */}
      {showEmojiPicker && (
          <div className="emoji-picker-container">
              <EmojiPicker 
                  onEmojiClick={onEmojiClick} 
                  height={350} 
                  width="100%" 
                  theme="dark"
                  searchDisabled={false} 
                  lazyLoadEmojis={true}
              />
          </div>
      )}

      {/* Preview de Imagem Selecionada */}
      {previewUrl && (
          <div className="image-preview-container">
              <img src={previewUrl} alt="Pré-visualização" className="image-preview" />
              <button type="button" onClick={clearInputs} className="remove-preview-button">
                  <i className="fas fa-times-circle"></i>
              </button>
          </div>
      )}
      
      {/* Preview de Áudio Gravado */}
      {recordedAudioUrl && (
          <div className="audio-preview-container">
            <audio src={recordedAudioUrl} controls className="audio-player" />
            <button type="button" onClick={clearInputs} className="remove-preview-button">
                <i className="fas fa-times-circle"></i>
            </button>
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Adicione um comentário ao áudio (opcional)"
                className="audio-comment-input"
            />
          </div>
      )}
      
      <form className="message-input-form" onSubmit={handleSubmit}>
        
        {/* Botão de Gravação de Áudio */}
        {/* Mostra o microfone (iniciar/parar) se não houver mídia pré-selecionada */}
        {!recordedAudioUrl && selectedFile === null && ( 
            <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`audio-record-button ${isRecording ? 'recording' : ''}`}
                disabled={isUploading}
                title={isRecording ? 'Parar Gravação' : 'Gravar Áudio'}
            >
                <i className={`fas ${isRecording ? 'fa-stop-circle' : 'fa-microphone'}`}></i>
            </button>
        )}
        
        {/* Botões de Emojis e Anexo */}
        <button type="button" onClick={() => setShowEmojiPicker(prev => !prev)} className="emoji-button" disabled={isUploading || isRecording} title="Selecionar Emoji">
            <i className="fas fa-smile"></i> 
        </button>

        <button type="button" onClick={triggerFileInput} className="attach-button" disabled={isUploading || isRecording || recordedAudioUrl !== null} title="Anexar Imagem">
            <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-paperclip'}`}></i>
        </button>

        {/* Input de texto (visível se não estiver gravando ou com áudio para enviar) */}
        {showTextInput && ( 
            <input
              type="text"
              id="message-input"
              name="message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={selectedFile ? "Adicione um comentário (opcional)" : `Conversar em ${channelName}`}
              autoComplete="off"
              disabled={isUploading || isRecording}
            />
        )}
        
        {/* Botão de enviar texto/imagem/áudio */}
        <button type="submit" disabled={isDisabled}>
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
      
      {/* Input de Arquivo Escondido */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*" 
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default MessageInput;