# Function: createTownWithRequirements()

```ts
function createTownWithRequirements(requirements): Promise<{
  alice: TestClient;
  aliceProvider: LocalhostWeb3Provider;
  aliceSpaceDapp: SpaceDapp;
  alicesWallet: Wallet;
  bob: TestClient;
  bobProvider: LocalhostWeb3Provider;
  bobSpaceDapp: SpaceDapp;
  bobsWallet: Wallet;
  bobUserStreamView: StreamStateView;
  carol: TestClient;
  carolProvider: LocalhostWeb3Provider;
  carolSpaceDapp: SpaceDapp;
  carolsWallet: Wallet;
  channelId: string;
  spaceId: string;
}>;
```

Defined in: [packages/sdk/src/tests/testUtils.ts:1294](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tests/testUtils.ts#L1294)

## Parameters

### requirements

#### duration?

`number`

#### everyone

`boolean`

#### ruleData

[`RuleDataV2Struct`](../../Towns-Protocol-Web3/namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)

#### users

`string`[]

## Returns

`Promise`\<\{
  `alice`: [`TestClient`](../interfaces/TestClient.md);
  `aliceProvider`: [`LocalhostWeb3Provider`](../../Towns-Protocol-Web3/classes/LocalhostWeb3Provider.md);
  `aliceSpaceDapp`: [`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md);
  `alicesWallet`: `Wallet`;
  `bob`: [`TestClient`](../interfaces/TestClient.md);
  `bobProvider`: [`LocalhostWeb3Provider`](../../Towns-Protocol-Web3/classes/LocalhostWeb3Provider.md);
  `bobSpaceDapp`: [`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md);
  `bobsWallet`: `Wallet`;
  `bobUserStreamView`: [`StreamStateView`](../classes/StreamStateView.md);
  `carol`: [`TestClient`](../interfaces/TestClient.md);
  `carolProvider`: [`LocalhostWeb3Provider`](../../Towns-Protocol-Web3/classes/LocalhostWeb3Provider.md);
  `carolSpaceDapp`: [`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md);
  `carolsWallet`: `Wallet`;
  `channelId`: `string`;
  `spaceId`: `string`;
\}\>
