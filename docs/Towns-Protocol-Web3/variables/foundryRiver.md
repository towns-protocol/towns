# Variable: foundryRiver

```ts
const foundryRiver: object;
```

Defined in: [packages/web3/src/test-helpers/TestEthBalance.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestEthBalance.ts#L7)

## Type declaration

### blockExplorers?

```ts
optional blockExplorers: object;
```

Collection of block explorers

#### Index Signature

```ts
[key: string]: ChainBlockExplorer
```

#### blockExplorers.default

```ts
blockExplorers.default: ChainBlockExplorer;
```

### contracts?

```ts
optional contracts: object;
```

Collection of contracts

#### Index Signature

```ts
[key: string]: 
  | undefined
  | ChainContract
  | {
[sourceId: number]: undefined | ChainContract;
}
```

#### contracts.ensRegistry?

```ts
optional contracts.ensRegistry: ChainContract;
```

#### contracts.ensUniversalResolver?

```ts
optional contracts.ensUniversalResolver: ChainContract;
```

#### contracts.multicall3?

```ts
optional contracts.multicall3: ChainContract;
```

#### contracts.universalSignatureVerifier?

```ts
optional contracts.universalSignatureVerifier: ChainContract;
```

### custom?

```ts
optional custom: Record<string, unknown>;
```

Custom chain data.

### ensTlds?

```ts
optional ensTlds: readonly string[];
```

Collection of ENS TLDs for the chain.

### fees?

```ts
optional fees: ChainFees<undefined>;
```

Modifies how fees are derived.

### formatters?

```ts
optional formatters: undefined;
```

Modifies how data is formatted and typed (e.g. blocks and transactions)

### id

```ts
id: 31338;
```

ID in number form

### name

```ts
name: "Foundry";
```

Human-readable name

### nativeCurrency

```ts
nativeCurrency: object;
```

Currency used by chain

#### nativeCurrency.decimals

```ts
readonly nativeCurrency.decimals: 18 = 18;
```

#### nativeCurrency.name

```ts
readonly nativeCurrency.name: "Ether" = 'Ether';
```

#### nativeCurrency.symbol

```ts
readonly nativeCurrency.symbol: "ETH" = 'ETH';
```

### network

```ts
readonly network: "foundry" = 'foundry';
```

### rpcUrls

```ts
rpcUrls: object;
```

Collection of RPC endpoints

#### rpcUrls.default

```ts
readonly rpcUrls.default: object;
```

#### rpcUrls.default.http

```ts
readonly rpcUrls.default.http: readonly ["http://127.0.0.1:8546"];
```

#### rpcUrls.default.webSocket

```ts
readonly rpcUrls.default.webSocket: readonly ["ws://127.0.0.1:8546"];
```

#### rpcUrls.public

```ts
readonly rpcUrls.public: object;
```

#### rpcUrls.public.http

```ts
readonly rpcUrls.public.http: readonly ["http://127.0.0.1:8546"];
```

#### rpcUrls.public.webSocket

```ts
readonly rpcUrls.public.webSocket: readonly ["ws://127.0.0.1:8546"];
```

### serializers?

```ts
optional serializers: ChainSerializers<undefined, TransactionSerializable>;
```

Modifies how data is serialized (e.g. transactions).

### sourceId?

```ts
optional sourceId: number;
```

Source Chain ID (ie. the L1 chain)

### testnet?

```ts
optional testnet: boolean;
```

Flag for test networks
