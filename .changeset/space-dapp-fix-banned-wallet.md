---
"@towns-protocol/web3": patch
---

Fixed crashes when calling `ban()`, `unban()`, or `isBanned()` on wallet addresses that don't own membership tokens. The `isBanned()` method now returns `false` for non-members instead of throwing, while `ban()` and `unban()` throw descriptive errors.
