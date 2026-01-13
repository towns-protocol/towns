---
"@towns-protocol/contracts": patch
---

Added a cap re-validation in \_onEntitlementCheckResultPosted() before minting. If the cap is reached, the pending join is rejected and the user is refunded.
