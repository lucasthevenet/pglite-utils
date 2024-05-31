import * as pglite from "@electric-sql/pglite";
import {
	type ColumnType,
	ColumnTypeEnum,
	JsonNullMarker,
} from "@prisma/driver-adapter-utils";

const ArrayColumnType = {
	BYTEA: 1001,
	CHAR: 1002,
	INT8: 1016,
	INT2: 1005,
	INT4: 1007,
	TEXT: 1009,
	OID: 1028,
	JSON: 199,
	FLOAT4: 1021,
	FLOAT8: 1022,
	VARCHAR: 1015,
	JSONB: 3807,
	DATE: 1182,
	TIMESTAMP: 1115,
	TIMESTAMPTZ: 1116,
  }

export class UnsupportedNativeDataType extends Error {
	// map of type codes to type names
	static typeNames: { [key: number]: string } = {
		16: "bool",
		17: "bytea",
		18: "char",
		19: "name",
		20: "int8",
		21: "int2",
		22: "int2vector",
		23: "int4",
		24: "regproc",
		25: "text",
		26: "oid",
		27: "tid",
		28: "xid",
		29: "cid",
		30: "oidvector",
		32: "pg_ddl_command",
		71: "pg_type",
		75: "pg_attribute",
		81: "pg_proc",
		83: "pg_class",
		114: "json",
		142: "xml",
		194: "pg_node_tree",
		269: "table_am_handler",
		325: "index_am_handler",
		600: "point",
		601: "lseg",
		602: "path",
		603: "box",
		604: "polygon",
		628: "line",
		650: "cidr",
		700: "float4",
		701: "float8",
		705: "unknown",
		718: "circle",
		774: "macaddr8",
		790: "money",
		829: "macaddr",
		869: "inet",
		1033: "aclitem",
		1042: "bpchar",
		1043: "varchar",
		1082: "date",
		1083: "time",
		1114: "timestamp",
		1184: "timestamptz",
		1186: "interval",
		1266: "timetz",
		1560: "bit",
		1562: "varbit",
		1700: "numeric",
		1790: "refcursor",
		2202: "regprocedure",
		2203: "regoper",
		2204: "regoperator",
		2205: "regclass",
		2206: "regtype",
		2249: "record",
		2275: "cstring",
		2276: "any",
		2277: "anyarray",
		2278: "void",
		2279: "trigger",
		2280: "language_handler",
		2281: "internal",
		2283: "anyelement",
		2287: "_record",
		2776: "anynonarray",
		2950: "uuid",
		2970: "txid_snapshot",
		3115: "fdw_handler",
		3220: "pg_lsn",
		3310: "tsm_handler",
		3361: "pg_ndistinct",
		3402: "pg_dependencies",
		3500: "anyenum",
		3614: "tsvector",
		3615: "tsquery",
		3642: "gtsvector",
		3734: "regconfig",
		3769: "regdictionary",
		3802: "jsonb",
		3831: "anyrange",
		3838: "event_trigger",
		3904: "int4range",
		3906: "numrange",
		3908: "tsrange",
		3910: "tstzrange",
		3912: "daterange",
		3926: "int8range",
		4072: "jsonpath",
		4089: "regnamespace",
		4096: "regrole",
		4191: "regcollation",
		4451: "int4multirange",
		4532: "nummultirange",
		4533: "tsmultirange",
		4534: "tstzmultirange",
		4535: "datemultirange",
		4536: "int8multirange",
		4537: "anymultirange",
		4538: "anycompatiblemultirange",
		4600: "pg_brin_bloom_summary",
		4601: "pg_brin_minmax_multi_summary",
		5017: "pg_mcv_list",
		5038: "pg_snapshot",
		5069: "xid8",
		5077: "anycompatible",
		5078: "anycompatiblearray",
		5079: "anycompatiblenonarray",
		5080: "anycompatiblerange",
	};

	type: string;

	constructor(code: number) {
		super();
		this.type = UnsupportedNativeDataType.typeNames[code] || "Unknown";
		this.message = `Unsupported column type ${this.type}`;
	}
}

/**
 * This is a simplification of quaint's value inference logic. Take a look at quaint's conversion.rs
 * module to see how other attributes of the field packet such as the field length are used to infer
 * the correct quaint::Value variant.
 */
export function fieldToColumnType(fieldTypeId: number): ColumnType {
	switch (fieldTypeId) {
		case pglite.types.INT2:
		case pglite.types.INT4:
			return ColumnTypeEnum.Int32;
		case pglite.types.INT8:
			return ColumnTypeEnum.Int64;
		case pglite.types.FLOAT4:
			return ColumnTypeEnum.Float;
		case pglite.types.FLOAT8:
			return ColumnTypeEnum.Double;
		case pglite.types.BOOL:
			return ColumnTypeEnum.Boolean;
		case pglite.types.DATE:
			return ColumnTypeEnum.Date;
		case pglite.types.TIME:
		case pglite.types.TIMETZ:
			return ColumnTypeEnum.Time;
		case pglite.types.TIMESTAMP:
		case pglite.types.TIMESTAMPTZ:
			return ColumnTypeEnum.DateTime;
		case pglite.types.NUMERIC:
		case pglite.types.MONEY:
			return ColumnTypeEnum.Numeric;
		case pglite.types.JSON:
		case pglite.types.JSONB:
			return ColumnTypeEnum.Json;
		case pglite.types.UUID:
			return ColumnTypeEnum.Uuid;
		case pglite.types.OID:
			return ColumnTypeEnum.Int64;
		case pglite.types.BPCHAR:
		case pglite.types.TEXT:
		case pglite.types.VARCHAR:
		case pglite.types.BIT:
		case pglite.types.VARBIT:
		case pglite.types.INET:
		case pglite.types.CIDR:
		case pglite.types.XML:
			return ColumnTypeEnum.Text;
		case pglite.types.BYTEA:
			return ColumnTypeEnum.Bytes;
		case ArrayColumnType.INT2:
		case ArrayColumnType.INT4:
			return ColumnTypeEnum.Int32Array;
		case ArrayColumnType.FLOAT4:
			return ColumnTypeEnum.FloatArray;
		case ArrayColumnType.FLOAT8:
			return ColumnTypeEnum.DoubleArray;
		case ArrayColumnType.CHAR:
			return ColumnTypeEnum.CharacterArray;
		case ArrayColumnType.TEXT:
		case ArrayColumnType.VARCHAR:
			return ColumnTypeEnum.TextArray;
		case ArrayColumnType.DATE:
			return ColumnTypeEnum.DateArray;
		case ArrayColumnType.TIMESTAMP:
		case ArrayColumnType.TIMESTAMPTZ:
			return ColumnTypeEnum.DateTimeArray;
		case ArrayColumnType.JSON:
		case ArrayColumnType.JSONB:
			return ColumnTypeEnum.JsonArray;
		case ArrayColumnType.BYTEA:
			return ColumnTypeEnum.BytesArray;
		case ArrayColumnType.OID:
		case ArrayColumnType.INT8:
			return ColumnTypeEnum.Int64Array;
		default:
			// Postgres custom types (types that come from extensions and user's enums).
			// We don't use `ColumnTypeEnum.Enum` for enums here and defer the decision to
			// the serializer in QE because it has access to the query schema, while on
			// this level we would have to query the catalog to introspect the type.
			if (fieldTypeId >= 10_000) {
				return ColumnTypeEnum.Text;
			}
			throw new UnsupportedNativeDataType(fieldTypeId);
	}
}
/****************************/
/* Number-related data-types  */
/****************************/

function normalize_numeric(numeric: string): string {
	return numeric
  }

/****************************/
/* Time-related data-types  */
/****************************/

function normalize_date(date: string): string {
	return date;
}

function normalize_timestamp(time: string): string {
	return time;
}

function normalize_timestampz(time: string): string {
	return time.split("+")[0] as string;
}

/*
 * TIME, TIMETZ, TIME_ARRAY - converts value (or value elements) to a string in the format HH:mm:ss.f
 */

function normalize_time(time: string): string {
	return time;
}

function normalize_timez(time: string): string {
	// Although it might be controversial, UTC is assumed in consistency with the behavior of rust postgres driver
	// in quaint. See quaint/src/connector/postgres/conversion.rs
	return time.split("+")[0] as string;
}
/******************/
/* Money handling */
/******************/

function normalize_money(money: string): string {
	return money.slice(1);
}

/*****************/
/* JSON handling */
/*****************/

/**
 * JsonNull are stored in JSON strings as the string "null", distinguishable from
 * the `null` value which is used by the driver to represent the database NULL.
 * By default, JSON and JSONB columns use JSON.parse to parse a JSON column value
 * and this will lead to serde_json::Value::Null in Rust, which will be interpreted
 * as DbNull.
 *
 * By converting "null" to JsonNullMarker, we can signal JsonNull in Rust side and
 * convert it to QuaintValue::Json(Some(Null)).
 */
function toJson(json: string): unknown {
	return json === "null" ? JsonNullMarker : JSON.parse(json);
}

/************************/
/* Binary data handling */
/************************/

/**
 * TODO:
 * 1. Check if using base64 would be more efficient than this encoding.
 * 2. Consider the possibility of eliminating re-encoding altogether
 *    and passing bytea hex format to the engine if that can be aligned
 *    with other adapters of the same database provider.
 */
function encodeBuffer(buffer: Buffer) {
	return Array.from(new Uint8Array(buffer));
}

/*
 * BYTEA - arbitrary raw binary strings
 */

const parsePgBytes = (x: string) => Buffer.from(x.slice(2), "hex")

/**
 * Convert bytes to a JSON-encodable representation since we can't
 * currently send a parsed Buffer or ArrayBuffer across JS to Rust
 * boundary.
 */
function convertBytes(serializedBytes: string): number[] {
	const buffer = parsePgBytes(serializedBytes)
	return encodeBuffer(buffer)
  }

/* BIT_ARRAY, VARBIT_ARRAY */

function normalizeBit(bit: string): string {
	return bit
  }

export const customParsers: pglite.ParserOptions = {
	[pglite.types.NUMERIC]: normalize_numeric,
	// [ArrayColumnType.NUMERIC]]: normalize_numeric,
	[pglite.types.TIME]: normalize_time,
	// [ArrayColumnType.TIME]]: normalize_time,
	[pglite.types.TIMETZ]: normalize_timez,
	[pglite.types.DATE]: normalize_date,
	[ArrayColumnType.DATE]: normalize_date,
	[pglite.types.TIMESTAMP]: normalize_timestamp,
	[ArrayColumnType.TIMESTAMP]: normalize_timestamp,
	[pglite.types.TIMESTAMPTZ]: normalize_timestampz,
	[ArrayColumnType.TIMESTAMPTZ]: normalize_timestampz,	
	[pglite.types.MONEY]: normalize_money,
	// [ArrayColumnType.MONEY]]: normalize_money,
	[pglite.types.JSON]: toJson,
	[ArrayColumnType.JSON]: toJson,
	[pglite.types.JSONB]: toJson,
	[ArrayColumnType.JSONB]: toJson,
	[pglite.types.BYTEA]: convertBytes,
	[ArrayColumnType.BYTEA]: convertBytes,
};

// https://github.com/brianc/node-postgres/pull/2930
export function fixArrayBufferValues(values: unknown[]) {
	for (let i = 0; i < values.length; i++) {
		const list = values[i];
		if (!Array.isArray(list)) {
			continue;
		}

		for (let j = 0; j < list.length; j++) {
			const listItem = list[j];
			if (ArrayBuffer.isView(listItem)) {
				list[j] = Buffer.from(
					listItem.buffer,
					listItem.byteOffset,
					listItem.byteLength,
				);
			}
		}
	}

	return values;
}
