import { PGlite } from "@electric-sql/pglite";
import { Command } from "commander";
import { execaCommand } from "execa";
import getPort, { portNumbers } from "get-port";
import { createServer } from "node:net";
import { PostgresConnection } from "pg-gateway";

const program = new Command().enablePositionalOptions();
program
  .name("pglite")
  .description('CLI utility for "@electric-sql/pglite"')
  .version("0.1.3");

program
  .command("listen")
  .option("--origin-port <port>", "The port to listen on", "5435")
  .action(async (originPort) => {
    // Create a TCP server
    const server = createServer((socket) => {
      // `PostgresConnection` will manage the protocol lifecycle
      const connection = new PostgresConnection(socket);
      console.log("\u{1F464} Client connected, IP: ", socket.remoteAddress);
    });

    server.listen(originPort, "localhost");
  });
program
  .command("prisma")
  .passThroughOptions()
  .action(async (_, cmd) => {
    const db = new PGlite("memory://main");
    const shadow_db = new PGlite("memory://shadow");
    const { port } = await createPGServer(db, 5433);
    const { port: shadow_port } = await createPGServer(shadow_db, 5434);
    await createMigrationsTable(db);
    await execaCommand(["npx", "prisma", ...cmd.args].join(" "), {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: `postgresql://postgres@localhost:${port}/postgres?schema=public`,
        SHADOW_DATABASE_URL: `postgresql://postgres@localhost:${shadow_port}/postgres?schema=public`,
      },
    });
  });
async function createMigrationsTable(db: PGlite) {
  await db.exec(`
        CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
            id                      VARCHAR(36) PRIMARY KEY NOT NULL,
            checksum                VARCHAR(64) NOT NULL,
            finished_at             TIMESTAMPTZ,
            migration_name          VARCHAR(255) NOT NULL,
            logs                    TEXT,
            rolled_back_at          TIMESTAMPTZ,
            started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
            applied_steps_count     INTEGER NOT NULL DEFAULT 0
        );
    `);
}
async function createPGServer(
  db: PGlite,
  desiredPort = 5432
): Promise<{
  port: number;
  db: PGlite;
}> {
  await db.waitReady;
  const server = createServer((socket) => {
    // `PostgresConnection` will manage the protocol lifecycle
    const connection = new PostgresConnection(socket);
  });
  const port = await getPort({
    port: portNumbers(desiredPort, desiredPort + 100),
  });
  return new Promise((resolve, reject) => {
    server.listen(port, async () => {
      console.log("Server started on port", port);
      resolve({ port, db });
    });
  });
}
program.parse();
