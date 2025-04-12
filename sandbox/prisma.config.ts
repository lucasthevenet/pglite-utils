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
      return new PrismaPGlite(new PGlite({ dataDir: ".pglite" }));
    },
  },
} satisfies PrismaConfig<Env>;
