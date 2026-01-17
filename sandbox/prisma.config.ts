import path from "node:path";
import { defineConfig } from "prisma/config";
// import your .env file
import "dotenv/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5433/mydb",
  },
});
