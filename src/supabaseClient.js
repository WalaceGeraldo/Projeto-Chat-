import { createClient } from '@supabase/supabase-js';

// As variáveis são carregadas do arquivo .env.local
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Verifica se as chaves existem antes de criar o cliente
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("ERRO DE CONFIGURAÇÃO: As chaves REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY não estão definidas no arquivo .env.local!");
}

// Cria o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);