import path from "node:path";
import type { PrismaConfig } from "prisma";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PGlite } from "@electric-sql/pglite";

type Env = {
  DATABASE_DIR: string;
};

export default {
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
  migrate: {
    async adapter() {
      const client = await PGlite.create({ dataDir: ".pglite" });
      return new PrismaPGlite(client);
    },
  },
  studio: {
    async adapter() {
      const client = await PGlite.create({ dataDir: ".pglite" });
      return new PrismaPGlite(client);
    },
  },
} satisfies PrismaConfig<Env>;
