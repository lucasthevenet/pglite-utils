import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { resolve } from "pathe";

async function initialize() {
  try {
    console.log("Initializing database...");
    const dataDir = resolve(process.env.DATABASE_URL ?? "./prisma/pgdata");
    const migration = await fs.promises.readFile("prisma/init.sql", "utf8");

    if (fs.existsSync(dataDir)) {
      console.log("Removing old database...");
      await fs.promises.rm(dataDir, { recursive: true, force: true });
    }

    const client = new PGlite(dataDir);

    await client.exec(migration);
  } catch (error) {
    console.error("Could not initialize database", error);
  }
}

initialize();
