"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";

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
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
        <User className="h-3.5 w-3.5" />
        <span className="hidden max-w-[150px] truncate sm:inline">{email}</span>
      </div>
      <button
        onClick={handleSignOut}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Sign out"
        type="button"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
