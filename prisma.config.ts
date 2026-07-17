import "dotenv/config";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({
  path: path.resolve(process.cwd(), "apps/api/.env"),
  override: false,
});

export default defineConfig({
  schema: "apps/api/prisma/schema.prisma",
  migrations: {
    path: "apps/api/prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});