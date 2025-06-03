# Function: setupWalletsAndContexts()

```ts
function setupWalletsAndContexts(): Promise<{
  alice: TestClient;
  aliceProvider: LocalhostWeb3Provider;
  alicesContext: SignerContext & object;
  aliceSpaceDapp: SpaceDapp;
  alicesWallet: Wallet;
  bob: TestClient;
  bobProvider: LocalhostWeb3Provider;
  bobsContext: SignerContext & object;
  bobSpaceDapp: SpaceDapp;
  bobsWallet: Wallet;
  carol: TestClient;
  carolProvider: LocalhostWeb3Provider;
  carolsContext: SignerContext & object;
  carolSpaceDapp: SpaceDapp;
  carolsWallet: Wallet;
}>;
```

Defined in: [packages/sdk/src/tests/testUtils.ts:309](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tests/testUtils.ts#L309)

## Returns

`Promise`\<\{
  `alice`: [`TestClient`](../interfaces/TestClient.md);
  `aliceProvider`: [`LocalhostWeb3Provider`](../../Towns-Protocol-Web3/classes/LocalhostWeb3Provider.md);
  `alicesContext`: [`SignerContext`](../interfaces/SignerContext.md) & `object`;
  `aliceSpaceDapp`: [`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md);
  `alicesWallet`: `Wallet`;
  `bob`: [`TestClient`](../interfaces/TestClient.md);
  `bobProvider`: [`LocalhostWeb3Provider`](../../Towns-Protocol-Web3/classes/LocalhostWeb3Provider.md);
  `bobsContext`: [`SignerContext`](../interfaces/SignerContext.md) & `object`;
  `bobSpaceDapp`: [`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md);
  `bobsWallet`: `Wallet`;
  `carol`: [`TestClient`](../interfaces/TestClient.md);
  `carolProvider`: [`LocalhostWeb3Provider`](../../Towns-Protocol-Web3/classes/LocalhostWeb3Provider.md);
  `carolsContext`: [`SignerContext`](../interfaces/SignerContext.md) & `object`;
  `carolSpaceDapp`: [`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md);
  `carolsWallet`: `Wallet`;
\}\>
