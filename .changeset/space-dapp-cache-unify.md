---
"@towns-protocol/web3": patch
---

Refactored cache mechanics to use `skipCache` option instead of `invalidateCache`. When `skipCache` is enabled, the cache bypasses reads but still writes fresh data to the cache while clearing stale entries.
