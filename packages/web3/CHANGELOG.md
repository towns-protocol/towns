# @towns-protocol/web3

## 1.0.4

### Patch Changes

- Updated dependencies []:
  - @towns-protocol/generated@1.0.4
  - @towns-protocol/utils@1.0.4

## 1.0.3

### Patch Changes

- Updated dependencies []:
  - @towns-protocol/generated@1.0.3
  - @towns-protocol/utils@1.0.3

## 1.0.2

### Patch Changes

- Updated dependencies []:
  - @towns-protocol/generated@1.0.2
  - @towns-protocol/utils@1.0.2

## 1.0.1

### Patch Changes

- [#4845](https://github.com/towns-protocol/towns/pull/4845) [`d81db9a`](https://github.com/towns-protocol/towns/commit/d81db9ac0d730377aae114df682589975385ba8a) Thanks [@miguel-nascimento](https://github.com/miguel-nascimento)! - Simplified cache key factory method names by removing the "Request" suffix. Methods like `spaceInfoRequest()`, `getEntitlementsRequest()`, and `balanceOfRequest()` are now simply `spaceInfo()`, `getEntitlements()`, and `balanceOf()`.

- [#4845](https://github.com/towns-protocol/towns/pull/4845) [`d81db9a`](https://github.com/towns-protocol/towns/commit/d81db9ac0d730377aae114df682589975385ba8a) Thanks [@miguel-nascimento](https://github.com/miguel-nascimento)! - Refactored cache mechanics to use `skipCache` option instead of `invalidateCache`. When `skipCache` is enabled, the cache bypasses reads but still writes fresh data to the cache while clearing stale entries.

- [#4845](https://github.com/towns-protocol/towns/pull/4845) [`d81db9a`](https://github.com/towns-protocol/towns/commit/d81db9ac0d730377aae114df682589975385ba8a) Thanks [@miguel-nascimento](https://github.com/miguel-nascimento)! - Fixed crashes when calling `ban()`, `unban()`, or `isBanned()` on wallet addresses that don't own membership tokens. The `isBanned()` method now returns `false` for non-members instead of throwing, while `ban()` and `unban()` throw descriptive errors.

- Updated dependencies []:
  - @towns-protocol/generated@1.0.1
  - @towns-protocol/utils@1.0.1
