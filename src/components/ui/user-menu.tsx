"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Displays the current user email and a sign out button.
export function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    (router as { push: (url: string) => void }).push("/login");
    router.refresh();
  }

  if (!email) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-slate-500 sm:inline">{email}</span>
      <button
        onClick={handleSignOut}
        className="rounded-full px-3 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-700"
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}
