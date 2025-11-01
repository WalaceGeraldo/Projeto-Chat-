import { createClient } from '@supabase/supabase-js';

// As variáveis são carregadas do arquivo .env.local
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Valores de fallback (para evitar o crash)
const DUMMY_URL = "https://dummy.supabase.co";
const DUMMY_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.DUMMY";

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        "ERRO CRÍTICO: Chaves Supabase ausentes. Verifique o arquivo .env.local e o formato REACT_APP_."
    );
}

// Cria o cliente Supabase: removemos a configuração 'storage' explícita
export const supabase = createClient(
    supabaseUrl || DUMMY_URL, 
    supabaseAnonKey || DUMMY_KEY, 
    {
        auth: {
            // REMOVIDO: storage: window.localStorage, (Confia no fallback do Supabase)
            persistSession: true,
            autoRefreshToken: true, 
            detectSessionInUrl: true,
        }
    }
);