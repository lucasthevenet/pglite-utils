import * as pglite from "@electric-sql/pglite";
import type {
	ColumnType,
	ConnectionInfo,
	DriverAdapter,
	Query,
	Queryable,
	Result,
	ResultSet,
	Transaction,
	TransactionContext,
	TransactionOptions,
} from "@prisma/driver-adapter-utils";
import { Debug, err, ok } from "@prisma/driver-adapter-utils";

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
> implements Queryable
{
	readonly provider = "postgres";
	readonly adapterName = packageName;

	constructor(protected readonly client: ClientT) {}

	async queryRaw(query: Query): Promise<Result<ResultSet>> {
		const tag = "[js::query_raw]";
		debug(`${tag} %O`, query);

		const res = await this.performIO(query);

		if (!res.ok) {
			return err(res.error);
		}

		const { fields, rows } = res.value;
		const columnNames = fields.map((field) => field.name);
		let columnTypes: ColumnType[] = [];

		try {
			columnTypes = fields.map((field) => fieldToColumnType(field.dataTypeID));
		} catch (e) {
			if (e instanceof UnsupportedNativeDataType) {
				return err({
					kind: "UnsupportedNativeDataType",
					type: e.type,
				});
			}
			throw e;
		}

		return ok({
			columnNames,
			columnTypes,
			rows: rows as ResultSet["rows"],
		});
	}

	async executeRaw(query: Query): Promise<Result<number>> {
		const tag = "[js::execute_raw]";
		debug(`${tag} %O`, query);

		// Note: `affectedRows` can sometimes be null (e.g., when executing `"BEGIN"`)
		return (await this.performIO(query)).map(
			({ affectedRows }) => affectedRows ?? 0,
		);
	}

	private async performIO(
		query: Query,
	): Promise<Result<pglite.Results<unknown>>> {
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

			return ok(result);
		} catch (e) {
			const error = e as Error;
			debug("Error in performIO: %O", error);
			if (
				typeof e === "object" &&
				typeof e.code === "string" &&
				typeof e.severity === "string" &&
				typeof e.message === "string"
			) {
				return err({
					kind: "Postgres",
					code: e.code,
					severity: e.severity,
					message: e.message,
					detail: e.detail,
					column: e.column,
					hint: e.hint,
				});
			}
			throw error;
		}
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

	async commit(): Promise<Result<void>> {
		debug("[js::commit]");
		this.txDeferred.resolve();
		return ok(await this.txResultPromise);
	}

	async rollback(): Promise<Result<void>> {
		debug("[js::rollback]");
		this.client.rollback();
		this.txDeferred.resolve();
		return ok(await this.txResultPromise);
	}
}

class PGliteTransactionContext
	extends PGliteQueryable<pglite.PGlite>
	implements TransactionContext
{
	constructor(readonly conn: pglite.PGlite) {
		super(conn);
	}

	async startTransaction(): Promise<Result<Transaction>> {
		const options: TransactionOptions = {
			usePhantomQuery: true,
		};

		const tag = "[js::startTransaction]";
		debug("%s options: %O", tag, options);

		return new Promise<Result<Transaction>>((resolve, reject) => {
			const txResultPromise = this.conn
				.transaction(async (tx) => {
					const [txDeferred, deferredPromise] = createDeferred<void>();
					const txWrapper = new PGliteTransaction(
						tx,
						options,
						txDeferred,
						txResultPromise,
					);
					resolve(ok(txWrapper));
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
		if (!(client instanceof pglite.PGlite)) {
			throw new TypeError(
				"PrismaPGlite must be initialized with an instance of PGlite",
			);
		}
		super(client);
	}

	getConnectionInfo(): Result<ConnectionInfo> {
		return ok({
			schemaName: this.options?.schema,
		});
	}

	async transactionContext(): Promise<Result<TransactionContext>> {
		await this.client.waitReady;
		return ok(new PGliteTransactionContext(this.client));
	}
}
