import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getRequiredEnv } from "@/lib/env";

let cachedClient: SupabaseClient | null = null;

// Returns a cached service-role Supabase client for ingestion writes and admin queries.
export function createSupabaseAdminClient() {
  if (!cachedClient) {
    cachedClient = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return cachedClient;
}
