import { setImmediate, setTimeout } from "node:timers/promises";
import type { PrismaPGlite } from "pglite-prisma-adapter";
import superjson from "superjson";
import { PrismaClient } from "../prisma/generated/client/client";

export async function smokeTest(adapter: PrismaPGlite) {
  // wait for the database pool to be initialized
  await setImmediate(0);

  // DEBUG='prisma:client:libraryEngine'
  const prisma = new PrismaClient({ adapter });

  console.log("[nodejs] connecting...");
  await prisma.$connect();
  console.log("[nodejs] connected");

  const test = new SmokeTest(prisma, adapter.provider);

  await test.testJSON();
  await test.testTypeTest2();
  await test.$raw();
  await test.testFindManyTypeTest();
  await test.transactionsWithConflicts();
  await test.testCreateAndDeleteChildParent();
  await test.interactiveTransactions();
  await test.explicitTransaction();
  await test.testBigInt();
  await test.testAllArrayTypes();

  console.log("[nodejs] disconnecting...");
  await prisma.$disconnect();
  console.log("[nodejs] disconnected");

  console.log("[nodejs] re-connecting...");
  await prisma.$connect();
  console.log("[nodejs] re-connecting");

  await setTimeout(0);

  console.log("[nodejs] re-disconnecting...");
  await prisma.$disconnect();
  console.log("[nodejs] re-disconnected");
}

class SmokeTest {
  constructor(
    private readonly prisma: PrismaClient,
    readonly provider: PrismaPGlite["provider"],
  ) {}

  async testJSON() {
    const json = {
      foo: "bar",
      baz: 1,
    };

    const created = await this.prisma.product.create({
      data: {
        properties: json,
      },
      select: {
        properties: true,
      },
    });

    console.log("[nodejs] created", superjson.serialize(created).json);

    const resultSet = await this.prisma.product.findMany({});
    console.log("[nodejs] resultSet", superjson.serialize(resultSet).json);

    await this.prisma.product.deleteMany({});
  }

  async testJSONArray() {
    const jsonArray = [
      {
        foo: "bar",
        baz: 1,
      },
    ];

    const created = await this.prisma.productWithJsonArray.create({
      data: {
        properties_arr: jsonArray,
      },
      select: {
        properties_arr: true,
      },
    });

    console.log("[nodejs] created", superjson.serialize(created).json);

    const resultSet = await this.prisma.product.findMany({});
    console.log("[nodejs] resultSet", superjson.serialize(resultSet).json);

    await this.prisma.product.deleteMany({});
  }

  async transactionsWithConflicts() {
    await this.prisma.leak_test.deleteMany();

    const one = async () => {
      await this.prisma.$transaction(async (tx) => {
        await tx.leak_test.create({ data: {} });
        await setTimeout(1000);
        throw new Error("Abort the mission");
      });
    };

    const two = async () => {
      await setTimeout(500);
      await this.prisma.leak_test.create({ data: {} });
    };

    await this.prisma.leak_test.deleteMany();
    await Promise.allSettled([one(), two()]);
  }

  async explicitTransaction() {
    const [children, totalChildren] = await this.prisma.$transaction(
      [this.prisma.child.findMany(), this.prisma.child.count()],
      {
        isolationLevel: "Serializable",
      },
    );

    console.log("[nodejs] children", superjson.serialize(children).json);
    console.log("[nodejs] totalChildren", totalChildren);
  }

  async $raw() {
    const cleanUp = async () => {
      await this.prisma.$executeRaw`DELETE FROM leak_test`;
    };

    await cleanUp();

    await this.prisma.$executeRaw`INSERT INTO leak_test (id) VALUES (1)`;
    const result = await this.prisma.$queryRaw`SELECT * FROM leak_test`;
    console.log("[nodejs] result", superjson.serialize(result).json);

    await cleanUp();
  }

  async interactiveTransactions() {
    const author = await this.prisma.author.create({
      data: {
        firstName: "Firstname 1 from autoincrement",
        lastName: "Lastname 1 from autoincrement",
        age: 99,
      },
    });
    console.log("[nodejs] author", superjson.serialize(author).json);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.author.deleteMany();
      await tx.post.deleteMany();

      const author = await tx.author.create({
        data: {
          firstName: "Firstname 2 from autoincrement",
          lastName: "Lastname 2 from autoincrement",
          age: 100,
        },
      });
      const post = await tx.post.create({
        data: {
          title: "Title from transaction",
          published: false,
          author: {
            connect: {
              id: author.id,
            },
          },
        },
      });
      return { author, post };
    });

    console.log("[nodejs] result", superjson.serialize(result).json);
  }

  async testTypeTest2() {
    const created = await this.prisma.type_test_2.create({
      data: {},
    });
    console.log("[nodejs] created", superjson.serialize(created).json);

    const resultSet = await this.prisma.type_test_2.findMany({});
    console.log("[nodejs] resultSet", superjson.serialize(resultSet).json);

    await this.prisma.type_test_2.deleteMany({});
  }

  async testFindManyTypeTest() {
    await this.testFindManyTypeTestPostgres();
  }

  private async testFindManyTypeTestPostgres() {
    if (this.provider !== "postgres") {
      return;
    }

    const resultSet = await this.prisma.type_test.findMany({
      select: {
        smallint_column: true,
        int_column: true,
        bigint_column: true,
        float_column: true,
        double_column: true,
        decimal_column: true,
        boolean_column: true,
        char_column: true,
        varchar_column: true,
        text_column: true,
        date_column: true,
        time_column: true,
        datetime_column: true,
        timestamp_column: true,
        json_column: true,
        enum_column: true,
      },
    });
    console.log("[nodejs] findMany resultSet", superjson.serialize(resultSet).json);

    return resultSet;
  }

  async testCreateAndDeleteChildParent() {
    /* Delete all child and parent records */

    await this.prisma.child.deleteMany();
    await this.prisma.parent.deleteMany();

    /* Create a parent with some new children */

    await this.prisma.child.create({
      data: {
        c: "c1",
        c_1: "foo",
        c_2: "bar",
        id: "0001",
      },
    });

    await this.prisma.parent.create({
      data: {
        p: "p1",
        p_1: "1",
        p_2: "2",
        id: "0001",
      },
    });

    /* Delete the parent */

    const resultDeleteMany = await this.prisma.parent.deleteMany({
      where: {
        p: "p1",
      },
    });
    console.log("[nodejs] resultDeleteMany", superjson.serialize(resultDeleteMany).json);
  }

  async testBigInt() {
    const result = await this.prisma.type_test_2.create({
      data: {
        bigint_column: 9223372036854775807n,
      },
    });

    if (typeof result.bigint_column === "bigint") {
      console.log("[nodejs] bigint_column is a bigint");
    }

    console.log("[nodejs] testBigInt result", superjson.serialize(result).json);
  }

  async testAllArrayTypes() {
    // Test data for all array types
    const testData = {
      // Int32Array types (INT2, INT4)
      int2_arr: [1, 2, 32767],
      int4_arr: [1, 2, 2147483647],
      // Int64Array types (INT8)
      int8_arr: [1n, 2n, 9223372036854775807n],
      // FloatArray (FLOAT4)
      float4_arr: [1.5, 2.5, 3.14],
      // DoubleArray (FLOAT8)
      float8_arr: [1.123456789, 2.987654321, Math.PI],
      // NumericArray (NUMERIC, MONEY)
      numeric_arr: ["123.45", "678.90"],
      money_arr: ["100.00", "200.50"],
      // BooleanArray (BOOL)
      bool_arr: [true, false, true],
      // CharacterArray (CHAR)
      char_arr: ["a", "b", "c"],
      // TextArray (BPCHAR, TEXT, VARCHAR, BIT, VARBIT, INET, CIDR, XML)
      bpchar_arr: ["hello     ", "world     "],
      text_arr: ["hello", "world", "test"],
      varchar_arr: ["varchar1", "varchar2"],
      bit_arr: ["10101010", "11110000"],
      varbit_arr: ["1010", "11110000"],
      inet_arr: ["192.168.1.1", "10.0.0.1"],
      xml_arr: ["<root>test</root>", "<data>value</data>"],
      // DateArray (DATE)
      date_arr: [new Date("2024-01-01"), new Date("2024-12-31")],
      // DateTimeArray (TIMESTAMP, TIMESTAMPTZ)
      timestamp_arr: [new Date("2024-01-01T12:00:00.000Z"), new Date("2024-12-31T23:59:59.999Z")],
      timestamptz_arr: [new Date("2024-01-01T12:00:00.000Z"), new Date("2024-12-31T23:59:59.999Z")],
      // JsonArray (JSON, JSONB)
      json_arr: [{ foo: "bar" }, { baz: 123 }],
      jsonb_arr: [{ key: "value" }, { nested: { data: true } }],
      // BytesArray (BYTEA)
      bytea_arr: [Buffer.from("hello"), Buffer.from("world")],
      // UuidArray (UUID)
      uuid_arr: ["550e8400-e29b-41d4-a716-446655440000", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
    };

    const created = await this.prisma.array_type_test.create({
      data: testData,
    });

    console.log("[nodejs] created", superjson.serialize(created).json);

    const resultSet = await this.prisma.array_type_test.findMany({});
    console.log("[nodejs] resultSet", superjson.serialize(resultSet).json);

    await this.prisma.array_type_test.deleteMany({});
  }
}
