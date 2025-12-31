import { type ParserOptions, types } from "@electric-sql/pglite";
import { type ArgType, type ColumnType, ColumnTypeEnum } from "@prisma/driver-adapter-utils";
import { parse as parseArray } from "postgres-array";

/**
 * Additional scalar column types not defined in `pg` types builtins.
 */
const AdditionalScalarColumnType = {
  NAME: 19,
};

const ScalarColumnType = types;

/**
 * PostgreSQL array column types (not defined in ScalarColumnType).
 *
 * See the semantics of each of this code in:
 *   https://github.com/postgres/postgres/blob/master/src/include/catalog/pg_type.dat
 */
const ArrayColumnType = {
  BIT: 1561,
  BOOL: 1000,
  BYTEA: 1001,
  BPCHAR: 1014,
  CHAR: 1002,
  CIDR: 651,
  DATE: 1182,
  FLOAT4: 1021,
  FLOAT8: 1022,
  INET: 1041,
  INT2: 1005,
  INT4: 1007,
  INT8: 1016,
  JSONB: 3807,
  JSON: 199,
  MONEY: 791,
  NUMERIC: 1231,
  OID: 1028,
  TEXT: 1009,
  TIMESTAMP: 1115,
  TIMESTAMPTZ: 1185,
  TIME: 1183,
  UUID: 2951,
  VARBIT: 1563,
  VARCHAR: 1015,
  XML: 143,
} as const;

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
    case ScalarColumnType.INT2:
    case ScalarColumnType.INT4:
      return ColumnTypeEnum.Int32;
    case ScalarColumnType.INT8:
      return ColumnTypeEnum.Int64;
    case ScalarColumnType.FLOAT4:
      return ColumnTypeEnum.Float;
    case ScalarColumnType.FLOAT8:
      return ColumnTypeEnum.Double;
    case ScalarColumnType.BOOL:
      return ColumnTypeEnum.Boolean;
    case ScalarColumnType.DATE:
      return ColumnTypeEnum.Date;
    case ScalarColumnType.TIME:
    case ScalarColumnType.TIMETZ:
      return ColumnTypeEnum.Time;
    case ScalarColumnType.TIMESTAMP:
    case ScalarColumnType.TIMESTAMPTZ:
      return ColumnTypeEnum.DateTime;
    case ScalarColumnType.NUMERIC:
    case ScalarColumnType.MONEY:
      return ColumnTypeEnum.Numeric;
    case ScalarColumnType.JSON:
    case ScalarColumnType.JSONB:
      return ColumnTypeEnum.Json;
    case ScalarColumnType.UUID:
      return ColumnTypeEnum.Uuid;
    case ScalarColumnType.OID:
      return ColumnTypeEnum.Int64;
    case ScalarColumnType.BPCHAR:
    case ScalarColumnType.TEXT:
    case ScalarColumnType.VARCHAR:
    case ScalarColumnType.BIT:
    case ScalarColumnType.VARBIT:
    case ScalarColumnType.INET:
    case ScalarColumnType.CIDR:
    case ScalarColumnType.XML:
    case AdditionalScalarColumnType.NAME:
      return ColumnTypeEnum.Text;
    case ScalarColumnType.CHAR:
      return ColumnTypeEnum.Character;
    case ScalarColumnType.BYTEA:
      return ColumnTypeEnum.Bytes;
    case ArrayColumnType.INT2:
    case ArrayColumnType.INT4:
      return ColumnTypeEnum.Int32Array;
    case ArrayColumnType.FLOAT4:
      return ColumnTypeEnum.FloatArray;
    case ArrayColumnType.FLOAT8:
      return ColumnTypeEnum.DoubleArray;
    case ArrayColumnType.NUMERIC:
    case ArrayColumnType.MONEY:
      return ColumnTypeEnum.NumericArray;
    case ArrayColumnType.BOOL:
      return ColumnTypeEnum.BooleanArray;
    case ArrayColumnType.CHAR:
      return ColumnTypeEnum.CharacterArray;
    case ArrayColumnType.BPCHAR:
    case ArrayColumnType.TEXT:
    case ArrayColumnType.VARCHAR:
    case ArrayColumnType.VARBIT:
    case ArrayColumnType.BIT:
    case ArrayColumnType.INET:
    case ArrayColumnType.CIDR:
    case ArrayColumnType.XML:
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
    case ArrayColumnType.UUID:
      return ColumnTypeEnum.UuidArray;
    case ArrayColumnType.INT8:
    case ArrayColumnType.OID:
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

function normalize_array(
  element_normalizer: (string: string) => string,
): (string: string) => string[] {
  return (str) => parseArray(str, element_normalizer);
}

/****************************/
/* Number-related data-types  */
/****************************/

function normalize_numeric(numeric: string): string {
  return numeric;
}

/****************************/
/* Time-related data-types  */
/****************************/

function normalize_date(date: string): string {
  return date;
}

function normalize_timestamp(time: string): string {
  return `${time.replace(" ", "T")}+00:00`;
}

function normalize_timestampz(time: string): string {
  return time.replace(" ", "T").replace(/[+-]\d{2}(:\d{2})?$/, "+00:00");
}

/*
 * TIME, TIMETZ, TIME - converts value (or value elements) to a string in the format HH:mm:ss.f
 */

function normalize_time(time: string): string {
  return time;
}

function normalize_timez(time: string): string {
  // Although it might be controversial, UTC is assumed in consistency with the behavior of rust postgres driver
  // in quaint. See quaint/src/connector/postgres/conversion.rs
  return time.replace(/[+-]\d{2}(:\d{2})?$/, "");
}
/******************/
/* Money handling */
/******************/

function normalize_money(money: string): string {
  return money.slice(1);
}

/******************/
/* XML handling */
/******************/
function normalize_xml(xml: string): string {
  return xml;
}

/*****************/
/* JSON handling */
/*****************/

/**
 * We hand off JSON handling entirely to engines, so we keep it
 * stringified here. This function needs to exist as otherwise
 * the default type parser attempts to deserialise it.
 */
function toJson(json: string): string {
  return json;
}

/************************/
/* Binary data handling */
/************************/

/*
 * BYTEA - arbitrary raw binary strings
 */

const parsePgBytes = (x: string): Uint8Array => {
  const hexString = x.slice(2);
  return Uint8Array.from({ length: hexString.length / 2 }, (_, idx) =>
    Number.parseInt(hexString.substring(idx * 2, (idx + 1) * 2), 16),
  );
};

/*
 * BYTEA_ARRAY - arrays of arbitrary raw binary strings
 */
function normalizeByteaArray(x: string) {
  return parseArray(x).map((x: string): Uint8Array => {
    const hexString = x.slice(2);
    return Uint8Array.from({ length: hexString.length / 2 }, (_, idx) =>
      Number.parseInt(hexString.substring(idx * 2, (idx + 1) * 2), 16),
    );
  });
}

/**
 * Convert bytes to a JSON-encodable representation since we can't
 * currently send a parsed Buffer or ArrayBuffer across JS to Rust
 * boundary.
 */
function convertBytes(serializedBytes: string): Uint8Array {
  return parsePgBytes(serializedBytes);
}

/* BIT, VARBIT */

function normalizeBit(bit: string): string {
  return bit;
}

function normalizeBigInt(bigint: string): string {
  return bigint;
}

export const customParsers: ParserOptions = {
  [ScalarColumnType.NUMERIC]: normalize_numeric,
  [ArrayColumnType.NUMERIC]: normalize_array(normalize_numeric),
  [ScalarColumnType.TIME]: normalize_time,
  [ArrayColumnType.TIME]: normalize_array(normalize_time),
  [ScalarColumnType.TIMETZ]: normalize_timez,
  [ScalarColumnType.DATE]: normalize_date,
  [ArrayColumnType.DATE]: normalize_array(normalize_date),
  [ScalarColumnType.TIMESTAMP]: normalize_timestamp,
  [ArrayColumnType.TIMESTAMP]: normalize_array(normalize_timestamp),
  [ScalarColumnType.TIMESTAMPTZ]: normalize_timestampz,
  [ArrayColumnType.TIMESTAMPTZ]: normalize_array(normalize_timestampz),
  [ScalarColumnType.MONEY]: normalize_money,
  [ArrayColumnType.MONEY]: normalize_array(normalize_money),
  [ScalarColumnType.JSON]: toJson,
  [ArrayColumnType.JSON]: normalize_array(toJson),
  [ScalarColumnType.JSONB]: toJson,
  [ArrayColumnType.JSONB]: normalize_array(toJson),
  [ScalarColumnType.BYTEA]: convertBytes,
  [ArrayColumnType.BYTEA]: normalizeByteaArray,
  [ArrayColumnType.BIT]: normalize_array(normalizeBit),
  [ArrayColumnType.VARBIT]: normalize_array(normalizeBit),
  [ArrayColumnType.XML]: normalize_array(normalize_xml),
  [ScalarColumnType.INT8]: normalizeBigInt,
  [ArrayColumnType.INT8]: normalize_array(normalizeBigInt),
};

export function mapArg<A>(
  arg: A | Date,
  argType: ArgType,
): null | unknown[] | string | Uint8Array | A {
  if (arg === null) {
    return null;
  }

  if (Array.isArray(arg) && argType.arity === "list") {
    return arg.map((value) => mapArg(value, argType));
  }

  if (typeof arg === "string" && argType.scalarType === "datetime") {
    arg = new Date(arg);
  }

  if (arg instanceof Date) {
    switch (argType.dbType) {
      case "TIME":
      case "TIMETZ":
        return formatTime(arg);
      case "DATE":
        return formatDate(arg);
      default:
        return formatDateTime(arg);
    }
  }

  if (typeof arg === "string" && argType.scalarType === "bytes") {
    return Buffer.from(arg, "base64");
  }

  // https://github.com/brianc/node-postgres/pull/2930
  if (ArrayBuffer.isView(arg)) {
    return new Uint8Array(arg.buffer, arg.byteOffset, arg.byteLength);
  }

  return arg;
}

function formatDateTime(date: Date): string {
  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  const ms = date.getUTCMilliseconds();
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds(),
  )}${ms ? `.${String(ms).padStart(3, "0")}` : ""}`;
}

function formatDate(date: Date): string {
  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

function formatTime(date: Date): string {
  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  const ms = date.getUTCMilliseconds();
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds(),
  )}${ms ? `.${String(ms).padStart(3, "0")}` : ""}`;
}
