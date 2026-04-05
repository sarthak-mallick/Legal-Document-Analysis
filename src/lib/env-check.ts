// Validate required environment variables at startup.
// Import this module from the root layout to fail fast if keys are missing.

const REQUIRED_VARS = [
  "GEMINI_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function validateEnv() {
  // Skip during build (CI may not have all env vars)
  if (process.env.SKIP_ENV_VALIDATION === "true") return;

  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `\n❌ Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n\nCopy .env.example to .env.local and fill in the required values.\n`,
    );
  }
}

// Run validation on import (server-side only)
validateEnv();
