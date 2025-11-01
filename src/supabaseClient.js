import { createClient } from '@supabase/supabase-js';

// As variáveis são carregadas do arquivo .env.local
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Verifica se as chaves existem antes de criar o cliente
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("ERRO DE CONFIGURAÇÃO: As chaves REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY não estão definidas no arquivo .env.local!");
}

// Cria o cliente Supabase com configuração explícita de storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // CRÍTICO: Define explicitamente o uso do localStorage.
    // Isso garante que o cliente saiba onde procurar a sessão imediatamente
    // e resolve problemas de race condition na inicialização.
    storage: window.localStorage, 
    // Garante que a sessão seja mantida. (Padrão: true)
    persistSession: true,
    // Garante que tokens expirados sejam renovados automaticamente.
    autoRefreshToken: true, 
    // Garante que o evento de sessão seja lido corretamente na inicialização.
    detectSessionInUrl: true,
  }
});