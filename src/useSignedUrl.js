import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Garante a importação do cliente Supabase

// Hook que recebe o caminho completo do arquivo e retorna uma URL temporária
export const useSignedUrl = (filePath, bucket = 'chat-media') => {
  const [signedUrl, setSignedUrl] = useState(null);
  
  useEffect(() => {
    if (!filePath) {
        setSignedUrl(null);
        return;
    }
    
    // 60 segundos (segundo parâmetro) é o tempo de validade do link
    const getSignedUrl = async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60); 

      if (error) {
        console.error("[Signed URL Hook] Falha ao gerar URL assinado:", error);
        setSignedUrl(null);
        return;
      }
      
      setSignedUrl(data.signedUrl);
    };

    getSignedUrl();

    // Limpa o URL ao desmontar
    return () => setSignedUrl(null); 
  }, [filePath, bucket]); 

  return signedUrl;
};