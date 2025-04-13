import path from "node:path";
import type { PrismaConfig } from "prisma";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";

// import your .env file
import "dotenv/config";

type Env = {
  DATABASE_DIR: string;
};

export default {
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
  migrate: {
    async adapter(env) {
      const client = new PGlite({ dataDir: env.DATABASE_DIR });
      return new PrismaPGlite(client);
    },
  },
  studio: {
    async adapter(env) {
      const client = new PGlite({ dataDir: env.DATABASE_DIR });
      return new PrismaPGlite(client);
    },
  },
} satisfies PrismaConfig<Env>;
