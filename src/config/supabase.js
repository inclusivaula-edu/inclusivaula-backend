import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("❌ Variáveis do Supabase não definidas no .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: ws }
});