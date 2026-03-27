import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

// Get the current user ID. Returns the authenticated user in production,
// falls back to a dev user ID in development when auth is not configured.
// Returns null if no user and not in dev mode.
export async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) return user.id;
  } catch {
    // Auth not available
  }

  if (process.env.NODE_ENV === "development") {
    return DEV_USER_ID;
  }

  return null;
}
