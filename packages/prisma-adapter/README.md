# pglite-prisma-adapter

A Prisma driver adapter for [PGlite](https://github.com/electric-sql/pglite) - the embedded PostgreSQL database for JavaScript.

## Overview

This adapter enables you to use Prisma ORM with PGlite, a serverless PostgreSQL database that runs in-process in Node.js applications. PGlite provides a fully SQL-compatible database without the need to run a database server.

## Prerequisites

- Node.js ≥ 18
- [Prisma CLI](https://www.prisma.io/docs/concepts/components/prisma-cli) installed

## Installation

Install the adapter and the PGlite driver:

```bash
npm install pglite-prisma-adapter @electric-sql/pglite
```

Or using yarn:

```bash
yarn add pglite-prisma-adapter @electric-sql/pglite
```

## Configuration

### Environment Setup

Create a `.env` file in your project root:

```env
# Path to the database directory (where PGlite will store its files)
DATABASE_DIR="./some/path"
```

### Prisma Schema Configuration

Create a `schema.prisma` file with the required configuration:

```prisma
// schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgres"
  // Note: This URL is required by Prisma but will be ignored when using the adapter
  url      = "postgresql://localhost:5432/mydb"
}

// Define your models
model User {
  id    Int     @id @default(autoincrement())
  email String? @unique(map: "uniq_email") @db.VarChar(255)
  name  String? @db.VarChar(255)
}
```

## Usage

### Basic Queries

Here's how to set up the adapter and run basic queries:

```js
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

// Initialize PGlite client with the database directory
const client = new PGlite(process.env.DATABASE_DIR);

// Initialize the PGlite adapter for Prisma
const adapter = new PrismaPGlite(client);

// Create Prisma client with the adapter
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create a new user
  const user = await prisma.user.create({
    data: {
      email: "user@example.com",
      name: "Example User",
    },
  });
  console.log("Created user:", user);

  // Query all users
  const users = await prisma.user.findMany();
  console.log("All users:", users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Transactions

PGlite adapter supports Prisma transactions:

```js
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const client = new PGlite(process.env.DATABASE_DIR);
const adapter = new PrismaPGlite(client);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    // This transaction will fail because both operations create users with the same email
    await prisma.$transaction([
      prisma.user.create({
        data: {
          email: "duplicate@example.com",
          name: "User 1",
        },
      }),
      prisma.user.create({
        data: {
          email: "duplicate@example.com", // Same email, will cause a unique constraint violation
          name: "User 2",
        },
      }),
    ]);
  } catch (error) {
    console.log("Transaction failed as expected:", error.message);

    // This transaction will succeed
    const result = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: "user1@example.com",
          name: "User 1",
        },
      }),
      prisma.user.create({
        data: {
          email: "user2@example.com",
          name: "User 2",
        },
      }),
    ]);

    console.log("Successful transaction:", result);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Schema Management

PGlite adapter supports Prisma Early Access migration commands, similar to Cloudflare D1 and Turso/LibSQL adapters.

### Migration Setup

Create a `prisma.config.ts` file in your project root:

```typescript
// prisma.config.ts
import path from "node:path";
import type { PrismaConfig } from "prisma";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
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
```

### Supported Migration Commands

With the configuration above, you can use these Prisma commands:

| Command                   | Description                                                  |
| ------------------------- | ------------------------------------------------------------ |
| `npx prisma db push`      | Updates your database schema based on your Prisma schema     |
| `npx prisma db pull`      | Introspects your database and updates your Prisma schema     |
| `npx prisma migrate diff` | Shows the difference between your database and Prisma schema |
| `npx prisma studio`       | Opens Prisma Studio to interact with your database           |

> **Note:** Support for `prisma migrate dev` and `prisma migrate deploy` is planned for future updates.

## Limitations

- This adapter supports Prisma Client for all CRUD operations
- Prisma migrations are supported via Early Access commands
- Some advanced Prisma features may not be fully supported yet

## Examples

For more detailed examples, check the [examples directory](https://github.com/electric-sql/pglite) in the PGlite repository.

## Credits

This adapter is based on:

- [@tidbcloud/prisma-adapter](https://github.com/tidbcloud/prisma-adapter)
- [@prisma/adapter-pg](https://github.com/prisma/prisma/tree/main/packages/adapter-pg)

## License

MIT
