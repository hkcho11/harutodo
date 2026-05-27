function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Copy .env.local.example to .env.local and fill in the values.`
    );
  }
  return value;
}

export const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
export const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
