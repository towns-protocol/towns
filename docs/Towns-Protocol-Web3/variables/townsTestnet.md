# Variable: townsTestnet

```ts
const townsTestnet: object;
```

Defined in: [packages/web3/src/chain.ts:27](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/chain.ts#L27)

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
readonly blockExplorers.default.url: "https://testnet.explorer.towns.com/" = 'https://testnet.explorer.towns.com/';
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
readonly contracts.multicall3.address: "0xcaBdE26Efcf78d31040Dc57F85484e786E0a1E13" = '0xcaBdE26Efcf78d31040Dc57F85484e786E0a1E13';
```

#### contracts.multicall3.blockCreated

```ts
readonly contracts.multicall3.blockCreated: 20137781 = 20137781;
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
id: 6524490;
```

ID in number form

### name

```ts
name: "Towns Testnet";
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
readonly rpcUrls.default.http: readonly ["https://testnet.rpc.towns.com/http"];
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
