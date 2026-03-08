import { createClient } from "@supabase/supabase-js";

import { getRequiredEnv } from "@/lib/env";

// This singleton builds the service-role Supabase client for ingestion writes.
export function createSupabaseAdminClient() {
  return createClient(
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

