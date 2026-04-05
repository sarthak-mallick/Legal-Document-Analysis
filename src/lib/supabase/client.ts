import { createBrowserClient } from "@supabase/ssr";

import { getRequiredEnv } from "@/lib/env";

// This factory creates the browser-side Supabase client for UI calls.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
