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
DATABASE_URL="./some/path"
```

> NOTE
> 
> The adapter only supports Prisma Client. Prisma migration and introspection are not supported, though I want to make a cli tool to help with that in the future.

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
    url          = env("DATABASE_URL")
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
const connectionString = `${process.env.DATABASE_URL}`;

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
const connectionString = `${process.env.DATABASE_URL}`;

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

## Credits
Based on other projects:
- [@tidbcloud/prisma-adapter](https://github.com/tidbcloud/prisma-adapter)
- [@prisma/adapter-pg](https://github.com/prisma/prisma/tree/main/packages/adapter-pg)