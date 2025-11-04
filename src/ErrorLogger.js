// src/ErrorLogger.js

const LOG_KEY = 'app_error_log';

/**
 * Registra um novo erro no localStorage.
 * @param {string} source - O componente ou função onde o erro ocorreu (ex: 'App.js Init', 'ChatScreen Fetch').
 * @param {string} message - A mensagem de erro.
 * @param {object} [details={}] - Detalhes adicionais (como estado atual ou erro original).
 */
export const logError = (source, message, details = {}) => {
  const timestamp = new Date().toISOString();
  
  const newEntry = {
    timestamp,
    source,
    message,
    details: JSON.stringify(details, null, 2), // Stringify para salvar objetos
  };

  try {
    // 1. Obtém o log atual
    const currentLog = JSON.parse(localStorage.getItem(LOG_KEY)) || [];
    
    // 2. Adiciona o novo log (limita a 50 entradas)
    currentLog.push(newEntry);
    if (currentLog.length > 50) {
      currentLog.shift(); // Remove o log mais antigo
    }

    // 3. Salva de volta no localStorage
    localStorage.setItem(LOG_KEY, JSON.stringify(currentLog));
    
    console.error(`[APP LOG] Erro registrado em ${source}:`, message, newEntry.details);

  } catch (storageError) {
      // Se houver erro ao escrever no localStorage (ex: storage lotado ou bloqueado)
      console.error("[APP LOG] Falha ao salvar log no Storage:", storageError, newEntry);
  }
};


/**
 * Retorna todos os logs de erro salvos.
 */
export const getErrorLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY)) || [];
  } catch {
    return [];
  }
};

/**
 * Limpa todos os logs de erro.
 */
export const clearErrorLogs = () => {
  localStorage.removeItem(LOG_KEY);
  console.log('[APP LOG] Logs de erro limpos.');
};