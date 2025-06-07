# Function: evaluateOperationsForEntitledWallet()

```ts
function evaluateOperationsForEntitledWallet(
   operations, 
   linkedWallets, 
xchainConfig): Promise<string>;
```

Defined in: [packages/web3/src/space/entitlements/entitlement.ts:689](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/entitlement.ts#L689)

## Parameters

### operations

[`Operation`](../type-aliases/Operation.md)[]

### linkedWallets

`string`[]

### xchainConfig

[`XchainConfig`](../type-aliases/XchainConfig.md)

## Returns

`Promise`\<`string`\>

An entitled wallet or the zero address, indicating no entitlement
