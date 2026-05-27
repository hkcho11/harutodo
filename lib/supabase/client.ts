import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { supabaseUrl, supabaseAnonKey } from "./config";

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
