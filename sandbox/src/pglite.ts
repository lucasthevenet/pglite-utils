import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { smokeTest } from "./test";

async function applyMigrations(client: PGlite) {
  // read prisma/migration.sql file and apply it
  console.log("Applying migrations...");
  const migration = await readFile("./prisma/migration.sql", "utf8");
  await client.exec(migration);
  console.log("Migrations applied");
}

async function main() {
  const pglite = new PGlite();
  const adapter = new PrismaPGlite(pglite);

  await applyMigrations(pglite);
  await smokeTest(adapter);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
