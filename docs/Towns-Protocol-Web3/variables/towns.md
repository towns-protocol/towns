# Variable: towns

```ts
const towns: object;
```

Defined in: [packages/web3/src/chain.ts:3](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/chain.ts#L3)

## Type declaration

### blockExplorers

```ts
blockExplorers: object;
```

Collection of block explorers

#### blockExplorers.default

```ts
readonly blockExplorers.default: object;
```

#### blockExplorers.default.name

```ts
readonly blockExplorers.default.name: "Towns Chain Explorer" = 'Towns Chain Explorer';
```

#### blockExplorers.default.url

```ts
readonly blockExplorers.default.url: "https://explorer.towns.com/" = 'https://explorer.towns.com/';
```

### contracts

```ts
contracts: object;
```

Collection of contracts

#### contracts.multicall3

```ts
readonly contracts.multicall3: object;
```

#### contracts.multicall3.address

```ts
readonly contracts.multicall3.address: "0x4920EF7722b73Fdc9f6391829cfB3844f39393B3" = '0x4920EF7722b73Fdc9f6391829cfB3844f39393B3';
```

#### contracts.multicall3.blockCreated

```ts
readonly contracts.multicall3.blockCreated: 12653370 = 12653370;
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
id: 550;
```

ID in number form

### name

```ts
name: "Towns Mainnet";
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
readonly rpcUrls.default.http: readonly ["https://mainnet.rpc.towns.com/"];
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
