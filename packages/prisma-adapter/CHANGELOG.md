# pglite-prisma-adapter

## 0.6.0

### Minor Changes

- 404da78: - add `supportsRelationJoins` to `getConnectionInfo` #28 #29
  - `@prisma/client` >= 6.10.0 is now required to use this new version

## 0.5.0

### Minor Changes

- 3cbb4a1: fix: Updated adapter implementation to be compatible with @prisma/client >= 6.5.0. #25

## 0.4.1

### Patch Changes

- 6c256ef: fix: Handle large numbers in `BigInt` columns correctly by @osaton in #23

## 0.4.0

### Minor Changes

- bccfa68: - Added missing methods to adapter implementation
  - `@prisma/client` >= 6.5.0 is now required to use this new version

## 0.3.0

### Minor Changes

- bfe83ae: Added changes for compatibility with Prisma's new TransactionContext

## 0.2.0

### Minor Changes

- 2c1ed81: fixed parsing for array types #11

## 0.1.3

### Patch Changes

- 323b216: gave credit where credit is due

## 0.1.2

### Patch Changes

- 014e2ec: Fixed unsupported native data type error handling

## 0.1.1

### Patch Changes

- 559fa0a: Fixed array types detection

## 0.1.0

### Minor Changes

- 02f38a1: Initial version
