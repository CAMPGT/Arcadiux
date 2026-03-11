// Load environment variables before any test
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

process.env.NODE_ENV = "test";

function loadTestEnv() {
  // Walk up to find .env
  const paths = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
  ];
  for (const p of paths) {
    try {
      const envFile = readFileSync(p, "utf-8");
      for (const line of envFile.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
      return;
    } catch {
      // try next path
    }
  }
}

loadTestEnv();
