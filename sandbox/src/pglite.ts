import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { smokeTest } from "./test";
import { readFile } from "node:fs/promises";

async function applyMigrations(client: PGlite) {
  // read prisma/migration.sql file and apply it
  console.log("Applying migrations...");
  const migration = await readFile("./prisma/migration.sql", "utf8");
  await client.exec(migration);
  console.log("Migrations applied");
}

async function main() {
  const client = new PGlite();
  const adapters = new PrismaPGlite(client);

  await applyMigrations(client);

  await smokeTest(adapters);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
