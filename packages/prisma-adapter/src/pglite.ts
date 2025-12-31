import * as pglite from "@electric-sql/pglite";
import type {
  ArgType,
  ColumnType,
  ConnectionInfo,
  IsolationLevel,
  SqlDriverAdapter,
  SqlMigrationAwareDriverAdapterFactory,
  SqlQuery,
  SqlQueryable,
  SqlResultSet,
  Transaction,
  TransactionOptions,
} from "@prisma/driver-adapter-utils";
import { Debug, DriverAdapterError } from "@prisma/driver-adapter-utils";

import type { PGliteWorker } from "@electric-sql/pglite/worker";
import { name as packageName } from "../package.json";
import { UnsupportedNativeDataType, customParsers, fieldToColumnType, mapArg } from "./conversion";
import { type Deferred, createDeferred } from "./deferred";

const debug = Debug("prisma:driver-adapter:pglite");

class PGliteQueryable<
  ClientT extends pglite.PGlite | PGliteWorker | pglite.Transaction,
> implements SqlQueryable {
  readonly provider = "postgres";
  readonly adapterName = packageName;

  constructor(protected readonly client: ClientT) {}

  async queryRaw(query: SqlQuery): Promise<SqlResultSet> {
    const tag = "[js::query_raw]";
    debug(`${tag} %O`, query);

    const { fields, rows } = await this.performIO(query);

    const columnNames = fields.map((field) => field.name);
    let columnTypes: ColumnType[] = [];

    try {
      columnTypes = fields.map((field) => fieldToColumnType(field.dataTypeID));
    } catch (e) {
      if (e instanceof UnsupportedNativeDataType) {
        throw new DriverAdapterError({
          kind: "UnsupportedNativeDataType",
          type: e.type,
        });
      }
      throw e;
    }

    return {
      columnNames,
      columnTypes,
      rows: rows as SqlResultSet["rows"],
    };
  }

  /**
   * Execute a query given as SQL, interpolating the given parameters and
   * returning the number of affected rows.
   */
  async executeRaw(query: SqlQuery): Promise<number> {
    const tag = "[js::execute_raw]";
    debug(`${tag} %O`, query);

    // Note: `affectedRows` can sometimes be null (e.g., when executing `"BEGIN"`)
    return (await this.performIO(query)).affectedRows ?? 0;
  }

  private async performIO(query: SqlQuery): Promise<pglite.Results<unknown>> {
    const { sql, args } = query;
    const values = args.map((arg, i) => mapArg(arg, query.argTypes[i] as ArgType));

    try {
      const result = await this.client.query(sql, values, {
        rowMode: "array",
        parsers: customParsers,
      });

      return result;
    } catch (e) {
      this.onError(e);
    }
  }

  protected onError(error: unknown): never {
    debug("Error in performIO: %O", error);
    if (error instanceof pglite.messages.DatabaseError) {
      throw new DriverAdapterError({
        kind: "postgres",
        code: error.code ?? "UNKNOWN",
        severity: error.severity ?? "UNKNOWN",
        message: error.message,
        detail: error.detail,
        column: error.column,
        hint: error.hint,
      });
    }
    throw error;
  }
}

class PGliteTransaction extends PGliteQueryable<pglite.Transaction> implements Transaction {
  constructor(
    client: pglite.Transaction,
    readonly options: TransactionOptions,
    private txDeferred: Deferred<void>,
    private txResultPromise: Promise<void>,
  ) {
    super(client);
  }

  async commit(): Promise<void> {
    debug("[js::commit]");
    this.txDeferred.resolve();
    return await this.txResultPromise;
  }

  async rollback(): Promise<void> {
    debug("[js::rollback]");
    this.client.rollback();
    this.txDeferred.resolve();
    return await this.txResultPromise;
  }
}

export type PrismaPGliteOptions = {
  schema?: string;
};

class PrismaPGliteAdapter extends PGliteQueryable<pglite.PGlite> implements SqlDriverAdapter {
  constructor(
    client: pglite.PGlite,
    private options?: PrismaPGliteOptions,
  ) {
    super(client);
  }

  executeScript(script: string): Promise<void> {
    try {
      this.client.exec(script);
    } catch (e) {
      this.onError(e);
    }
    return Promise.resolve();
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      schemaName: this.options?.schema,
      supportsRelationJoins: true,
    };
  }

  async startTransaction(isolationLevel?: IsolationLevel): Promise<Transaction> {
    const options: TransactionOptions = {
      usePhantomQuery: true,
    };

    const tag = "[js::startTransaction]";
    debug("%s options: %O", tag, options);
    if (isolationLevel) {
      await this.client
        .exec(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`)
        .catch((error) => this.onError(error));
    }
    return this.startTransactionInner(this.client, options);
  }

  async startTransactionInner(
    conn: pglite.PGlite,
    options: TransactionOptions,
  ): Promise<Transaction> {
    return new Promise<Transaction>((resolve, reject) => {
      const txResultPromise = conn
        .transaction(async (tx) => {
          const [txDeferred, deferredPromise] = createDeferred<void>();
          const txWrapper = new PGliteTransaction(tx, options, txDeferred, txResultPromise);
          resolve(txWrapper);
          return deferredPromise;
        })
        .catch((error) => {
          return reject(error);
        });
    });
  }

  async dispose(): Promise<void> {
    // return this.client.close();
    return Promise.resolve();
  }
}

export class PrismaPGliteAdapterFactory implements SqlMigrationAwareDriverAdapterFactory {
  readonly provider = "postgres";
  readonly adapterName = packageName;

  constructor(private readonly client: pglite.PGlite) {}

  connect(): Promise<SqlDriverAdapter> {
    return Promise.resolve(new PrismaPGliteAdapter(this.client));
  }

  connectToShadowDb(): Promise<SqlDriverAdapter> {
    return Promise.resolve(
      new PrismaPGliteAdapter(new pglite.PGlite({ dataDir: "memory://shadow" })),
    );
  }
}
