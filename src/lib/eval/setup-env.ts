import { readFileSync } from "fs";
import { resolve } from "path";

// Loads .env.local into process.env for eval runs (the app gets these from Next.js,
// but standalone eval scripts need them injected manually). No dotenv dependency.
function loadEnvFile(fileName: string) {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), fileName), "utf8");
  } catch {
    return; // file is optional
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");
