import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { Context } from "hono";

// Function to initialize DB with Cloudflare Worker Env
export function getDB(c: Context) {
  const sql = neon(c.env.DATABASE_URL);  // ✅ Use `c.env.DATABASE_URL`
  return drizzle(sql);
}
