---
"@towns-protocol/smart-account": patch
---

Introduced ERC-4337 modular smart account SDK with viem integration, account type detection, batch operations support, and ReplaySafeHash signature protection.

```typescript
import { createBundlerClient } from "viem/account-abstraction";
import { toModularSmartAccount } from "@towns-protocol/smart-account/create2";

const account = await toModularSmartAccount({
  client: publicClient,
  owner: localAccount,
});

const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http("https://your-bundler-url.com"),
});

const userOpHash = await bundlerClient.sendUserOperation({
  account,
  calls: [{ to: recipient, value: parseEther("0.1") }],
});
```
