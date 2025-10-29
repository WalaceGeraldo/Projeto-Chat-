import React, { useCallback } from 'react'; // Adicionado useCallback
import './ImageModal.css';

function ImageModal({ imageUrl, onClose }) {
    
    // --- CORRIGIDO: Encapsula handleKeyDown em useCallback ---
    const handleKeyDown = useCallback((event) => {
        // Verifica se a tecla pressionada é ESC
        if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose]); // Depende apenas de onClose

    // Adiciona o listener de keydown ao corpo do documento quando o modal é montado
    React.useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            // Remove o listener ao desmontar o componente
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]); // <-- CORRIGIDO: Agora depende da função memoizada handleKeyDown

    return (
        // Contêiner principal do modal (fundo escuro - backdrop)
        <div className="image-modal-backdrop" onClick={onClose}>
            
            {/* Contêiner da imagem: 
                Impede que o clique feche o modal (e.stopPropagation())
            */}
            <div 
              className="image-modal-content" 
              onClick={e => e.stopPropagation()} 
            >
                <img src={imageUrl} alt="Visualização em tela cheia" className="full-screen-image" />
                
                {/* Botão de fechar (X) */}
                <button 
                  className="modal-close-button" 
                  onClick={onClose}
                  aria-label="Fechar visualização"
                >
                    <i className="fas fa-times"></i>
                </button>
            </div>
        </div>
    );
}

export default ImageModal;