import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * Browser-only Supabase client. Every page stays statically rendered; account
 * features run client-side and row-level security in the database is what
 * protects the data (see active/config/supabase/migrations). Returns null on
 * the server or when the env vars are missing, so a build never depends on
 * Supabase being reachable.
 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}
