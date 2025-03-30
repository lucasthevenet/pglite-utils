import * as pglite from "@electric-sql/pglite";
import type {
	ColumnType,
	ConnectionInfo,
	DriverAdapter,
	SqlQuery,
	SqlQueryable,
	SqlResultSet,
	Transaction,
	TransactionContext,
	TransactionOptions,
} from "@prisma/driver-adapter-utils";
import { Debug, DriverAdapterError } from "@prisma/driver-adapter-utils";

import type { PGliteWorker } from "@electric-sql/pglite/worker";
import { name as packageName } from "../package.json";
import {
	UnsupportedNativeDataType,
	customParsers,
	fieldToColumnType,
	fixArrayBufferValues,
} from "./conversion";
import { type Deferred, createDeferred } from "./deferred";

const debug = Debug("prisma:driver-adapter:pglite");

class PGliteQueryable<
	ClientT extends pglite.PGlite | PGliteWorker | pglite.Transaction,
> implements SqlQueryable
{
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
		const { sql, args: values } = query;

		try {
			const result = await this.client.query(
				sql,
				fixArrayBufferValues(values),
				{
					rowMode: "array",
					parsers: customParsers,
				},
			);

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

class PGliteTransaction
	extends PGliteQueryable<pglite.Transaction>
	implements Transaction
{
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

class PGliteTransactionContext
	extends PGliteQueryable<pglite.PGlite>
	implements TransactionContext
{
	constructor(readonly conn: pglite.PGlite) {
		super(conn);
	}

	async startTransaction(): Promise<Transaction> {
		const options: TransactionOptions = {
			usePhantomQuery: true,
		};

		const tag = "[js::startTransaction]";
		debug("%s options: %O", tag, options);

		return new Promise<Transaction>((resolve, reject) => {
			const txResultPromise = this.conn
				.transaction(async (tx) => {
					const [txDeferred, deferredPromise] = createDeferred<void>();
					const txWrapper = new PGliteTransaction(
						tx,
						options,
						txDeferred,
						txResultPromise,
					);
					resolve(txWrapper);
					return deferredPromise;
				})
				.catch((error) => {
					return reject(error);
				});
		});
	}
}

export type PrismaPGliteOptions = {
	schema?: string;
};

export class PrismaPGlite
	extends PGliteQueryable<pglite.PGlite>
	implements DriverAdapter
{
	constructor(
		client: pglite.PGlite,
		private options?: PrismaPGliteOptions,
	) {
		super(client);
	}

	executeScript(_script: string): Promise<void> {
		throw new Error("Not implemented yet");
	}

	getConnectionInfo(): ConnectionInfo {
		return {
			schemaName: this.options?.schema,
		};
	}

	async transactionContext(): Promise<TransactionContext> {
		await this.client.waitReady;
		return new PGliteTransactionContext(this.client);
	}

	async dispose(): Promise<void> {
		// if (!this.client.closed) {
		//   await this.client.close();
		// }
	}
}
