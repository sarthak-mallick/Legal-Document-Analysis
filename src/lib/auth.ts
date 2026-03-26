import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

// Get the current user ID. Falls back to a dev user ID when auth is not configured.
export async function getUserId(): Promise<string> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) return user.id;
  } catch {
    // Auth not available — use dev fallback
  }

  return DEV_USER_ID;
}
