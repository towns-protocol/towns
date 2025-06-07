# Function: makeRandomUserContext()

```ts
function makeRandomUserContext(): Promise<SignerContextWithWallet>;
```

Defined in: [packages/sdk/src/tests/testUtils.ts:245](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tests/testUtils.ts#L245)

## Returns

`Promise`\<[`SignerContextWithWallet`](../type-aliases/SignerContextWithWallet.md)\>

a random user context
Done using a worker thread to avoid blocking the main thread
