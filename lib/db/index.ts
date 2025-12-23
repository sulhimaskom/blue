import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { env } from "../env";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in the environment");
}

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });
