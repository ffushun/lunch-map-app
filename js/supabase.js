import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

console.log("SUPABASE_URL=", SUPABASE_URL);
console.log("SUPABASE_ANON_KEY=", SUPABASE_ANON_KEY);

export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
