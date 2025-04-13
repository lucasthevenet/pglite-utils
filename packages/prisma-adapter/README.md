# pglite-adapter-prisma

Prisma driver adapter for [Pglite Driver](https://github.com/electric-sql/pglite).

## Before you start

Before you start, make sure you have:

- Node >= 18
- [Prisma CLI](https://www.prisma.io/docs/concepts/components/prisma-cli) installed

## Install

You will need to install the `pglite-prisma-adapter` driver adapter and the `@electric-sql/pglite` serverless driver.

```
npm install pglite-prisma-adapter @electric-sql/pglite
```

## DATABASE URL

Set the environment to your .env file in the local environment.

```env
// .env
DATABASE_DIR="./some/path"
```

> NOTE
>
> The adapter supports Prisma Client, and Prisma migration and introspection are partially supported. You can check which commands are supported in the documentation.

## Define Prisma schema

First, you need to create a Prisma schema file called schema.prisma and define the model. Here we use the user as an example.

```prisma
// schema.prisma
generator client {
    provider        = "prisma-client-js"
    previewFeatures = ["driverAdapters"]
}

datasource db {
    provider     = "postgres"
    // We need to provide a stub value for the db url because prisma will throw a valid postgres url is not provided
    url          = "postgresql://localhost:5432/mydb"
}

// define model according to your database table
model user {
    id    Int     @id @default(autoincrement())
    email String? @unique(map: "uniq_email") @db.VarChar(255)
    name  String? @db.VarChar(255)
}
```

## Query

Here is an example of query:

```js
// query.js
import { PGlite } from '@electric-sql/pglite';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// setup
dotenv.config();
const connectionString = `${process.env.DATABASE_DIR}`;

// init prisma client
const client = new PGlite(connectionString);
const adapter = new PrismaPGlite(client);
const prisma = new PrismaClient({ adapter });

// insert
const user = await prisma.user.create({
    data: {
        email: 'test@prisma.io',
        name: 'test',
    },
})
console.log(user)

// query after insert
console.log(await prisma.user.findMany())
```

## Transaction

Here is an example of transaction:

```js
// query.js
import { PGlite } from '@electric-sql/pglite';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// setup
dotenv.config();
const connectionString = `${process.env.DATABASE_DIR}`;

// init prisma client
const client = new PGlite(connectionString);
const adapter = new PrismaPGlite(client);
const prisma = new PrismaClient({ adapter });

const createUser1 = prisma.user.create({
  data: {
    email: 'yuhang.shi@pingcap.com',
    name: 'Shi Yuhang',
  },
})

const createUser2 = prisma.user.create({
  data: {
    email: 'yuhang.shi@pingcap.com',
    name: 'Shi Yuhang2',
  },
})

const createUser3 = prisma.user.create({
  data: {
    email: 'yuhang2.shi@pingcap.com',
    name: 'Shi Yuhang2',
  },
})
try {
  await prisma.$transaction([createUser1, createUser2]) // Operations fail together
} catch (e) {
  console.log(e)
  await prisma.$transaction([createUser1, createUser3]) // Operations succeed together
}
```

## Early Access Migration Commands

PGlite adapter now supports Prisma Early Access migration commands, similar to Cloudflare D1 and Turso/LibSQL. This allows you to run schema management commands against your PGlite database.

### Setup for Migration Commands

Create a `prisma.config.ts` file in your project root:

```typescript
// prisma.config.ts
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
```

### Environment Variables

Make sure your `.env` file contains the required variables:

```env
# Path to the database directory
DATABASE_DIR="./some/path"
```

### Supported Commands

With this setup, you can now use these Prisma commands:

- `prisma db push`: Updates the schema of your PGlite database based on your Prisma schema
- `prisma db pull`: Introspects the schema of your PGlite database and updates your local Prisma schema
- `prisma migrate diff`: Outputs the difference between the schema of your PGlite database and your local Prisma schema
- `prisma studio`: Open Prisma Studio to interact with your database (using the studio adapter)

### Example Usage

To update your database schema based on your Prisma schema:

```bash
npx prisma db push
```

To introspect your database and update your Prisma schema:

```bash
npx prisma db pull
```

> **Note:** Support for `prisma migrate dev` and `prisma migrate deploy` will be added in future updates.

## Credits
Based on other projects:
- [@tidbcloud/prisma-adapter](https://github.com/tidbcloud/prisma-adapter)
- [@prisma/adapter-pg](https://github.com/prisma/prisma/tree/main/packages/adapter-pg)
