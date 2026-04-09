import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Handle the email confirmation redirect from Supabase.
// Supabase sends users here with a ?code= param after they click the confirmation link.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // If code is missing or exchange failed, redirect to login with an error hint
  return NextResponse.redirect(`${origin}/login`);
}
