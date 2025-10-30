import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react'; 
import { supabase } from '../supabaseClient'; // <-- Importar cliente Supabase

function MessageInput({ onSendMessage, channelName, currentUser, activeChannel }) { 
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null); 
  const [isUploading, setIsUploading] = useState(false); 

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); 


  // Efeito de Limpeza: Revoga URLs temporárias do navegador
  useEffect(() => {
    return () => {
        if (previewUrl) { URL.revokeObjectURL(previewUrl); }
    };
  }, [previewUrl]);


  // Função para emitir evento de digitação (Simplificada)
  const emitTypingEvent = (eventType) => {
    // A lógica de digitação real será implementada via API Realtime do Supabase no ChatScreen.
  };

  // Efeito para detectar início/fim da digitação (simplificado)
  useEffect(() => {
    const isTyping = text.trim().length > 0 || selectedFile;
    
    if (isTyping) {
      emitTypingEvent('typingStart');
      if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); }
      typingTimeoutRef.current = setTimeout(() => {
        emitTypingEvent('typingStop');
      }, 1500); 
    } else if (typingTimeoutRef.current) { /* Ação de limpeza de timer */ }

    return () => { /* Ação de limpeza de listener */ };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, selectedFile, currentUser, activeChannel]); 


  // --- FUNÇÃO DE LIMPEZA GERAL DE INPUTS ---
  const clearInputs = () => {
    setText('');
    setSelectedFile(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  };


  // Função para lidar com a seleção de arquivo (apenas imagem)
  const handleFileChange = (event) => { 
    const file = event.target.files[0];
    if (file) {
        setSelectedFile(file);
        // Cria uma URL de pré-visualização temporária no navegador
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setText(''); // Limpa o texto normal
    }
    // Limpa o valor do input de arquivo para permitir upload do mesmo arquivo novamente
    event.target.value = null; 
  };
  
  // Função auxiliar para disparar o input de arquivo oculto
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Função para adicionar emoji ao input
  const onEmojiClick = (emojiData) => {
    setText(prevText => prevText + emojiData.emoji);
    setShowEmojiPicker(false); // Fecha o picker após a seleção
  };


  // --- FUNÇÃO PRINCIPAL DE ENVIO (Upload para Supabase Storage) ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    const canSend = text.trim().length > 0 || selectedFile;
    if (!canSend || isUploading) return;

    setIsUploading(true);

    let messageText = text.trim() || null;
    let fileUrl = null;
    let fileType = null;
    
    let fileToUpload = selectedFile;
    
    // 1. Lógica de Upload de Mídia para Supabase Storage
    if (fileToUpload) {
        
        fileType = fileToUpload.type;
        const fileExtension = fileType.split('/')[1] || 'jpg';
        
        // Define o caminho no Storage (Ex: 'images/timestamp-user.jpg')
        const filePath = `images/${Date.now()}-${currentUser.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;
        
        try {
            // CORREÇÃO: Removemos 'data' para evitar o aviso ESLint (linha 106)
            const { error } = await supabase.storage 
                .from('chat-media') // Nome do bucket no Supabase
                .upload(filePath, fileToUpload, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                throw new Error(error.message);
            }

            // Obtém a URL pública direta da imagem
            const { data: publicUrlData } = supabase.storage
                .from('chat-media')
                .getPublicUrl(filePath);
                
            fileUrl = publicUrlData.publicUrl;
            
            console.log('[Supabase] Upload de imagem bem-sucedido. URL:', fileUrl);
            
        } catch (error) {
            console.error("[Supabase] Falha no upload:", error);
            alert(`Erro ao enviar mídia para o Storage: ${error.message}. Verifique as regras do Storage.`);
            setIsUploading(false);
            return;
        }
    }

    // 2. Determina o Tipo de Mensagem
    let type;
    if (fileType?.startsWith('image') && messageText) {
        type = 'text-with-image';
    } else if (fileType?.startsWith('image')) {
        type = 'image';
    } else {
        type = 'text'; 
    }

    // Envia a mensagem para o ChatWindow, que a salvará no Supabase DB
    onSendMessage(messageText, fileUrl, type); 

    // Limpeza após envio bem-sucedido
    clearInputs(); 
    setIsUploading(false);
    emitTypingEvent('typingStop');
  };
  // --------------------------------------------------------------------------

  const isDisabled = isUploading || (!text.trim() && !selectedFile);


  return (
    <div className="message-input-wrapper">
      
      {/* Seletor de Emojis */}
      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <EmojiPicker onEmojiClick={onEmojiClick} height={300} width="100%" />
        </div>
      )}

      {/* Preview de Imagem Selecionada */}
      {previewUrl && (
        <div className="image-preview-container">
          <img src={previewUrl} alt="Preview" className="image-preview" />
          <button 
            type="button" 
            className="remove-preview-button" 
            onClick={clearInputs}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      
      
      <form className="message-input-form" onSubmit={handleSubmit}>
        
        {/* Botão de Emojis */}
        <button type="button" onClick={() => setShowEmojiPicker(prev => !prev)} className="emoji-button" disabled={isUploading} title="Selecionar Emoji">
            <i className="fas fa-smile"></i> 
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
        accept="image/*" 
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default MessageInput;