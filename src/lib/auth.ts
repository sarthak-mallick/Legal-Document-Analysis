import { createSupabaseServerClient } from "@/lib/supabase/server";

// Get the current authenticated user ID, or null if not signed in.
export async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id ?? null;
  } catch {
    return null;
  }
}
