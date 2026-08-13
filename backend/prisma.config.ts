import "dotenv/config"; // Must be first — loads .env before Prisma reads env vars
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
});
