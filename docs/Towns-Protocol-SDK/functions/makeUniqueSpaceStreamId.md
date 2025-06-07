# Function: makeUniqueSpaceStreamId()

```ts
function makeUniqueSpaceStreamId(): string;
```

Defined in: [packages/sdk/src/tests/testUtils.ts:235](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tests/testUtils.ts#L235)

makeUniqueSpaceStreamId - space stream ids are derived from the contract
in tests without entitlements there are no contracts, so we use a random id

## Returns

`string`
