import React, { useState, useEffect, useRef, useCallback } from 'react';
import EmojiPicker from 'emoji-picker-react'; 
import { supabase } from '../supabaseClient'; 

// CRÍTICO: Recebe activeChannel como prop
function MessageInput({ channelName, currentUser, activeChannel }) { 
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef(null); // Agora será USADO
  const fileInputRef = useRef(null); 
  const [isUploading, setIsUploading] = useState(false); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); 
  const [isRecording, setIsRecording] = useState(false); 


  // Efeito de Limpeza: Revoga URLs temporárias do navegador
  useEffect(() => {
    return () => {
        if (previewUrl) { URL.revokeObjectURL(previewUrl); }
    };
  }, [previewUrl]);


  // Função para emitir evento de digitação (Simplificada)
  const emitTypingEvent = (eventType) => { /* Placeholder: Aqui vai a lógica de Presença do Supabase */ }; 
  
  // --- Efeito de Digitação (Correção de Warning) ---
  useEffect(() => {
    const isTyping = text.trim().length > 0 || selectedFile;
    
    if (isTyping) {
      emitTypingEvent('typingStart');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // O typingTimeoutRef está sendo usado aqui, resolvendo o aviso
      typingTimeoutRef.current = setTimeout(() => {
        emitTypingEvent('typingStop');
      }, 2000);
    } else {
      emitTypingEvent('typingStop');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [text, selectedFile, channelName]);
  

  // --- FUNÇÃO DE SALVAMENTO NO BANCO DE DADOS ---
  const saveMessageToDB = useCallback(async (payload) => {
    
    // 1. LÓGICA DE DM: Cria um nome de canal canônico (Ordem Alfabética)
    let finalChannelName;
    
    if (activeChannel.type === 'dm') {
        const users = [currentUser, activeChannel.name].sort(); 
        finalChannelName = `DM_${users[0]}_${users[1]}`; 
    } else {
        finalChannelName = channelName; 
    }
    // ------------------------------------------

    // 2. Montar a mensagem com o channel_name correto
    const messagePayload = {
      sender: currentUser,
      channel_name: finalChannelName, 
      content: payload.content,
      caption: payload.caption,
      type: payload.type,
    };
    
    // Remove campos nulos/vazios desnecessários
    const cleanedPayload = Object.fromEntries(
        Object.entries(messagePayload).filter(([_, v]) => v !== null && v !== undefined)
    );

    // 3. INSERT NO SUPABASE
    const { error } = await supabase
      .from('messages')
      .insert([cleanedPayload]);

    if (error) {
      console.error("ERRO AO INSERIR MENSAGEM NO DB:", error);
      alert("Falha ao enviar. Verifique o RLS da tabela 'messages'.");
      return false;
    }
    return true;

  }, [currentUser, channelName, activeChannel]);


  // --- FUNÇÃO DE SALVAMENTO: Arquivo (Upload e DB Insert) ---
  const uploadFileAndSendMessage = useCallback(async (file, caption) => {
    setIsUploading(true);
    
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${currentUser}.${fileExtension}`;
    const storagePath = `images/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error("Erro no upload do arquivo:", uploadError);
      setIsUploading(false);
      return;
    }

    const fileUrl = `${supabase.storage.url}/object/public/chat-media/${uploadData.path}`;

    // 3. Salvar o registro da mensagem no Supabase DB
    await saveMessageToDB({
        content: fileUrl, 
        caption: caption || null,
        type: file.type.startsWith('image/') ? 'image' : 'file',
    });

    setIsUploading(false);
  }, [currentUser, saveMessageToDB]);


  // --- FUNÇÃO PRINCIPAL: Envio ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const textContent = text.trim();

    if (selectedFile) {
        if (selectedFile.type.startsWith('image/')) {
            await uploadFileAndSendMessage(selectedFile, textContent);
        }
    } else if (textContent) {
        await saveMessageToDB({
            content: textContent,
            caption: null,
            type: 'text'
        });
    }
    
    // Limpar o formulário e o estado de arquivo
    setText('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowEmojiPicker(false);
    
    emitTypingEvent('typingStop');
  };
  

  // --- Lógica de Seleção de Arquivo e UI (Mantida) ---
  const handleFileChange = (e) => { 
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); 
      setText('');
      setShowEmojiPicker(false);
    }
  };
  const triggerFileInput = () => { fileInputRef.current?.click(); };
  const handleRemoveFile = () => { 
    if (previewUrl) { URL.revokeObjectURL(previewUrl); }
    setSelectedFile(null);
    setPreviewUrl(null);
    setText('');
  };
  const onEmojiClick = (emojiData, event) => { 
    setText(prevText => prevText + emojiData.emoji);
    setShowEmojiPicker(false);
  };
  const handleAudioClick = () => { setIsRecording(prev => !prev); }; 
  
  const isDisabled = isUploading || (!text.trim() && !selectedFile);


  return (
    <div className="message-input-wrapper">
      
      {/* Modal de Emoji */}
      {showEmojiPicker && (
          <div className="emoji-picker-modal">
              <EmojiPicker 
                  onEmojiClick={onEmojiClick} 
                  height={350} 
                  searchDisabled={false}
                  skinTonesDisabled={true}
              />
          </div>
      )}
      
      {/* Pré-visualização de Arquivo Selecionado */}
      {previewUrl && (
          <div className="file-preview">
              <span className="file-info">
                  {selectedFile.type.startsWith('image/') ? (
                      <img src={previewUrl} alt="Pré-visualização" className="preview-image" />
                  ) : (
                      <i className="fas fa-file"></i>
                  )}
                  {selectedFile.name} 
              </span>
              <button type="button" onClick={handleRemoveFile} className="remove-file-button" title="Remover arquivo">
                  <i className="fas fa-times"></i>
              </button>
          </div>
      )}
      
      
      <form className="message-input-form" onSubmit={handleSubmit}>
        
        {/* Botões de Emojis */}
        <button type="button" onClick={() => setShowEmojiPicker(prev => !prev)} className="emoji-button" disabled={isUploading} title="Selecionar Emoji">
            <i className="fas fa-smile"></i> 
        </button>

        {/* Botão de Áudio/Microfone */}
        <button type="button" onClick={handleAudioClick} className={`audio-record-button ${isRecording ? 'recording' : ''}`} disabled={isUploading} title="Gravar Áudio">
            <i className="fas fa-microphone"></i> 
        </button>

        {/* Botão de Anexar Imagem */}
        <button type="button" onClick={triggerFileInput} className="attach-button" disabled={isUploading} title="Anexar Imagem">
            <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-paperclip'}`}></i>
        </button>

        {/* Input de texto */}
        <input
          type="text"
          id="message-input"
          name="message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={selectedFile ? "Adicione um comentário (opcional)" : `Conversar em ${channelName}`}
          autoComplete="off"
          disabled={isUploading}
        />
        
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
        style={{ display: 'none' }}
        accept="image/*" // Aceita apenas imagens
      />
    </div>
  );
}

export default MessageInput;