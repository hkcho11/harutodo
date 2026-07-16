import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { supabaseUrl, supabaseAnonKey } from "./config";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}
