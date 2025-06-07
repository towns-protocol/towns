# Class: LocalhostWeb3Provider

Defined in: [packages/web3/src/test-helpers/LocalhostWeb3Provider.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/LocalhostWeb3Provider.ts#L11)

## theme_extends

- `JsonRpcProvider`

## Constructors

### Constructor

```ts
new LocalhostWeb3Provider(rpcUrl, wallet?): LocalhostWeb3Provider;
```

Defined in: [packages/web3/src/test-helpers/LocalhostWeb3Provider.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/LocalhostWeb3Provider.ts#L23)

#### Parameters

##### rpcUrl

`string`

##### wallet?

`Wallet`

#### Returns

`LocalhostWeb3Provider`

#### Overrides

```ts
ethers.providers.JsonRpcProvider.constructor
```

## Properties

### \_bootstrapPoll

```ts
_bootstrapPoll: Timer;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:66

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._bootstrapPoll
```

***

### \_emitted

```ts
_emitted: object;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:61

#### Index Signature

```ts
[eventName: string]: number | "pending"
```

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._emitted
```

***

### \_eventLoopCache

```ts
_eventLoopCache: Record<string, Promise<any>>;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:32

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._eventLoopCache
```

***

### \_events

```ts
_events: Event[];
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:59

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._events
```

***

### \_fastBlockNumber

```ts
_fastBlockNumber: number;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:69

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._fastBlockNumber
```

***

### \_fastBlockNumberPromise

```ts
_fastBlockNumberPromise: Promise<number>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:70

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._fastBlockNumberPromise
```

***

### \_fastQueryDate

```ts
_fastQueryDate: number;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:71

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._fastQueryDate
```

***

### \_internalBlockNumber

```ts
_internalBlockNumber: Promise<{
  blockNumber: number;
  reqTime: number;
  respTime: number;
}>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:73

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._internalBlockNumber
```

***

### \_isProvider

```ts
readonly _isProvider: boolean;
```

Defined in: node\_modules/@ethersproject/abstract-provider/lib/index.d.ts:152

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._isProvider
```

***

### \_lastBlockNumber

```ts
_lastBlockNumber: number;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:67

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._lastBlockNumber
```

***

### \_maxFilterBlockRange

```ts
_maxFilterBlockRange: number;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:68

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._maxFilterBlockRange
```

***

### \_maxInternalBlockNumber

```ts
_maxInternalBlockNumber: number;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:72

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._maxInternalBlockNumber
```

***

### \_network

```ts
_network: Network;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:58

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._network
```

***

### \_networkPromise

```ts
_networkPromise: Promise<Network>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:57

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._networkPromise
```

***

### \_nextId

```ts
_nextId: number;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:31

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._nextId
```

***

### \_pendingFilter

```ts
_pendingFilter: Promise<number>;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:30

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._pendingFilter
```

***

### \_poller

```ts
_poller: Timer;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:65

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._poller
```

***

### \_pollingInterval

```ts
_pollingInterval: number;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:64

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._pollingInterval
```

***

### anyNetwork

```ts
readonly anyNetwork: boolean;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:78

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.anyNetwork
```

***

### connection

```ts
readonly connection: ConnectionInfo;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:29

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.connection
```

***

### disableCcipRead

```ts
disableCcipRead: boolean;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:79

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.disableCcipRead
```

***

### formatter

```ts
formatter: Formatter;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:60

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.formatter
```

***

### wallet

```ts
wallet: Wallet;
```

Defined in: [packages/web3/src/test-helpers/LocalhostWeb3Provider.ts:13](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/LocalhostWeb3Provider.ts#L13)

## Accessors

### \_cache

#### Get Signature

```ts
get _cache(): Record<string, Promise<any>>;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:33

##### Returns

`Record`\<`string`, `Promise`\<`any`\>\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._cache
```

***

### blockNumber

#### Get Signature

```ts
get blockNumber(): number;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:101

##### Returns

`number`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.blockNumber
```

***

### isMetaMask

#### Get Signature

```ts
get isMetaMask(): boolean;
```

Defined in: [packages/web3/src/test-helpers/LocalhostWeb3Provider.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/LocalhostWeb3Provider.ts#L15)

##### Returns

`boolean`

***

### network

#### Get Signature

```ts
get network(): Network;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:98

##### Returns

`Network`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.network
```

***

### polling

#### Get Signature

```ts
get polling(): boolean;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:102

##### Returns

`boolean`

#### Set Signature

```ts
set polling(value): void;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:103

##### Parameters

###### value

`boolean`

##### Returns

`void`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.polling
```

***

### pollingInterval

#### Get Signature

```ts
get pollingInterval(): number;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:104

##### Returns

`number`

#### Set Signature

```ts
set pollingInterval(value): void;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:105

##### Parameters

###### value

`number`

##### Returns

`void`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.pollingInterval
```

***

### ready

#### Get Signature

```ts
get ready(): Promise<Network>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:91

##### Returns

`Promise`\<`Network`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.ready
```

***

### signer

#### Get Signature

```ts
get signer(): Signer;
```

Defined in: [packages/web3/src/test-helpers/LocalhostWeb3Provider.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/LocalhostWeb3Provider.ts#L19)

##### Returns

`Signer`

## Methods

### \_addEventListener()

```ts
_addEventListener(
   eventName, 
   listener, 
   once): this;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:147

#### Parameters

##### eventName

`EventType`

##### listener

`Listener`

##### once

`boolean`

#### Returns

`this`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._addEventListener
```

***

### \_call()

```ts
_call(
   transaction, 
   blockTag, 
attempt): Promise<string>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:127

#### Parameters

##### transaction

`TransactionRequest`

##### blockTag

`BlockTag`

##### attempt

`number`

#### Returns

`Promise`\<`string`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._call
```

***

### \_getAddress()

```ts
_getAddress(addressOrName): Promise<string>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:130

#### Parameters

##### addressOrName

`string` | `Promise`\<`string`\>

#### Returns

`Promise`\<`string`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._getAddress
```

***

### \_getBlock()

```ts
_getBlock(blockHashOrBlockTag, includeTransactions?): Promise<Block | BlockWithTransactions>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:131

#### Parameters

##### blockHashOrBlockTag

`BlockTag` | `Promise`\<`BlockTag`\>

##### includeTransactions?

`boolean`

#### Returns

`Promise`\<`Block` \| `BlockWithTransactions`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._getBlock
```

***

### \_getBlockTag()

```ts
_getBlockTag(blockTag): Promise<BlockTag>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:138

#### Parameters

##### blockTag

`BlockTag` | `Promise`\<`BlockTag`\>

#### Returns

`Promise`\<`BlockTag`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._getBlockTag
```

***

### \_getFastBlockNumber()

```ts
_getFastBlockNumber(): Promise<number>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:106

#### Returns

`Promise`\<`number`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._getFastBlockNumber
```

***

### \_getFilter()

```ts
_getFilter(filter): Promise<Filter | FilterByBlockHash>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:126

#### Parameters

##### filter

`Filter` | `FilterByBlockHash` | `Promise`\<`Filter` \| `FilterByBlockHash`\>

#### Returns

`Promise`\<`Filter` \| `FilterByBlockHash`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._getFilter
```

***

### \_getInternalBlockNumber()

```ts
_getInternalBlockNumber(maxAge): Promise<number>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:95

#### Parameters

##### maxAge

`number`

#### Returns

`Promise`\<`number`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._getInternalBlockNumber
```

***

### \_getResolver()

```ts
_getResolver(name, operation?): Promise<string>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:140

#### Parameters

##### name

`string`

##### operation?

`string`

#### Returns

`Promise`\<`string`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._getResolver
```

***

### \_getTransactionRequest()

```ts
_getTransactionRequest(transaction): Promise<Transaction>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:125

#### Parameters

##### transaction

`Deferrable`\<`TransactionRequest`\>

#### Returns

`Promise`\<`Transaction`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._getTransactionRequest
```

***

### \_ready()

```ts
_ready(): Promise<Network>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:90

#### Returns

`Promise`\<`Network`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._ready
```

***

### \_setFastBlockNumber()

```ts
_setFastBlockNumber(blockNumber): void;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:107

#### Parameters

##### blockNumber

`number`

#### Returns

`void`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._setFastBlockNumber
```

***

### \_startEvent()

```ts
_startEvent(event): void;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:44

#### Parameters

##### event

`Event`

#### Returns

`void`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._startEvent
```

***

### \_startPending()

```ts
_startPending(): void;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:45

#### Returns

`void`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._startPending
```

***

### \_stopEvent()

```ts
_stopEvent(event): void;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:46

#### Parameters

##### event

`Event`

#### Returns

`void`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._stopEvent
```

***

### \_uncachedDetectNetwork()

```ts
_uncachedDetectNetwork(): Promise<Network>;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:37

#### Returns

`Promise`\<`Network`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._uncachedDetectNetwork
```

***

### \_waitForTransaction()

```ts
_waitForTransaction(
   transactionHash, 
   confirmations, 
   timeout, 
replaceable): Promise<TransactionReceipt>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:109

#### Parameters

##### transactionHash

`string`

##### confirmations

`number`

##### timeout

`number`

##### replaceable

###### data

`string`

###### from

`string`

###### nonce

`number`

###### startBlock

`number`

###### to

`string`

###### value

`BigNumber`

#### Returns

`Promise`\<`TransactionReceipt`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._waitForTransaction
```

***

### \_wrapTransaction()

```ts
_wrapTransaction(
   tx, 
   hash?, 
   startBlock?): TransactionResponse;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:123

#### Parameters

##### tx

`Transaction`

##### hash?

`string`

##### startBlock?

`number`

#### Returns

`TransactionResponse`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider._wrapTransaction
```

***

### addListener()

```ts
addListener(eventName, listener): Provider;
```

Defined in: node\_modules/@ethersproject/abstract-provider/lib/index.d.ts:149

#### Parameters

##### eventName

`EventType`

##### listener

`Listener`

#### Returns

`Provider`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.addListener
```

***

### call()

```ts
call(transaction, blockTag?): Promise<string>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:128

#### Parameters

##### transaction

`Deferrable`\<`TransactionRequest`\>

##### blockTag?

`BlockTag` | `Promise`\<`BlockTag`\>

#### Returns

`Promise`\<`string`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.call
```

***

### ccipReadFetch()

```ts
ccipReadFetch(
   tx, 
   calldata, 
urls): Promise<null | string>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:94

#### Parameters

##### tx

`Transaction`

##### calldata

`string`

##### urls

`string`[]

#### Returns

`Promise`\<`null` \| `string`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.ccipReadFetch
```

***

### detectNetwork()

```ts
detectNetwork(): Promise<Network>;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:36

#### Returns

`Promise`\<`Network`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.detectNetwork
```

***

### emit()

```ts
emit(eventName, ...args): boolean;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:150

#### Parameters

##### eventName

`EventType`

##### args

...`any`[]

#### Returns

`boolean`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.emit
```

***

### estimateGas()

```ts
estimateGas(transaction): Promise<BigNumber>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:129

#### Parameters

##### transaction

`Deferrable`\<`TransactionRequest`\>

#### Returns

`Promise`\<`BigNumber`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.estimateGas
```

***

### fundWallet()

```ts
fundWallet(walletToFund): Promise<boolean>;
```

Defined in: [packages/web3/src/test-helpers/LocalhostWeb3Provider.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/LocalhostWeb3Provider.ts#L29)

#### Parameters

##### walletToFund

`string` | `Wallet`

#### Returns

`Promise`\<`boolean`\>

***

### getAvatar()

```ts
getAvatar(nameOrAddress): Promise<null | string>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:143

#### Parameters

##### nameOrAddress

`string`

#### Returns

`Promise`\<`null` \| `string`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getAvatar
```

***

### getBalance()

```ts
getBalance(addressOrName, blockTag?): Promise<BigNumber>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:119

#### Parameters

##### addressOrName

`string` | `Promise`\<`string`\>

##### blockTag?

`BlockTag` | `Promise`\<`BlockTag`\>

#### Returns

`Promise`\<`BigNumber`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getBalance
```

***

### getBlock()

```ts
getBlock(blockHashOrBlockTag): Promise<Block>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:132

#### Parameters

##### blockHashOrBlockTag

`BlockTag` | `Promise`\<`BlockTag`\>

#### Returns

`Promise`\<`Block`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getBlock
```

***

### getBlockNumber()

```ts
getBlockNumber(): Promise<number>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:117

#### Returns

`Promise`\<`number`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getBlockNumber
```

***

### getBlockWithTransactions()

```ts
getBlockWithTransactions(blockHashOrBlockTag): Promise<BlockWithTransactions>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:133

#### Parameters

##### blockHashOrBlockTag

`BlockTag` | `Promise`\<`BlockTag`\>

#### Returns

`Promise`\<`BlockWithTransactions`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getBlockWithTransactions
```

***

### getCode()

```ts
getCode(addressOrName, blockTag?): Promise<string>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:121

#### Parameters

##### addressOrName

`string` | `Promise`\<`string`\>

##### blockTag?

`BlockTag` | `Promise`\<`BlockTag`\>

#### Returns

`Promise`\<`string`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getCode
```

***

### getEtherPrice()

```ts
getEtherPrice(): Promise<number>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:137

#### Returns

`Promise`\<`number`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getEtherPrice
```

***

### getFeeData()

```ts
getFeeData(): Promise<FeeData>;
```

Defined in: node\_modules/@ethersproject/abstract-provider/lib/index.d.ts:127

#### Returns

`Promise`\<`FeeData`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getFeeData
```

***

### getGasPrice()

```ts
getGasPrice(): Promise<BigNumber>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:118

#### Returns

`Promise`\<`BigNumber`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getGasPrice
```

***

### getLogs()

```ts
getLogs(filter): Promise<Log[]>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:136

#### Parameters

##### filter

`Filter` | `FilterByBlockHash` | `Promise`\<`Filter` \| `FilterByBlockHash`\>

#### Returns

`Promise`\<`Log`[]\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getLogs
```

***

### getNetwork()

```ts
getNetwork(): Promise<Network>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:100

#### Returns

`Promise`\<`Network`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getNetwork
```

***

### getResolver()

```ts
getResolver(name): Promise<null | Resolver>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:139

#### Parameters

##### name

`string`

#### Returns

`Promise`\<`null` \| `Resolver`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getResolver
```

***

### getSigner()

```ts
getSigner(addressOrIndex?): JsonRpcSigner;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:38

#### Parameters

##### addressOrIndex?

`string` | `number`

#### Returns

`JsonRpcSigner`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getSigner
```

***

### getStorageAt()

```ts
getStorageAt(
   addressOrName, 
   position, 
blockTag?): Promise<string>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:122

#### Parameters

##### addressOrName

`string` | `Promise`\<`string`\>

##### position

`BigNumberish` | `Promise`\<`BigNumberish`\>

##### blockTag?

`BlockTag` | `Promise`\<`BlockTag`\>

#### Returns

`Promise`\<`string`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getStorageAt
```

***

### getTransaction()

```ts
getTransaction(transactionHash): Promise<TransactionResponse>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:134

#### Parameters

##### transactionHash

`string` | `Promise`\<`string`\>

#### Returns

`Promise`\<`TransactionResponse`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getTransaction
```

***

### getTransactionCount()

```ts
getTransactionCount(addressOrName, blockTag?): Promise<number>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:120

#### Parameters

##### addressOrName

`string` | `Promise`\<`string`\>

##### blockTag?

`BlockTag` | `Promise`\<`BlockTag`\>

#### Returns

`Promise`\<`number`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getTransactionCount
```

***

### getTransactionReceipt()

```ts
getTransactionReceipt(transactionHash): Promise<TransactionReceipt>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:135

#### Parameters

##### transactionHash

`string` | `Promise`\<`string`\>

#### Returns

`Promise`\<`TransactionReceipt`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getTransactionReceipt
```

***

### getUncheckedSigner()

```ts
getUncheckedSigner(addressOrIndex?): UncheckedJsonRpcSigner;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:39

#### Parameters

##### addressOrIndex?

`string` | `number`

#### Returns

`UncheckedJsonRpcSigner`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getUncheckedSigner
```

***

### listAccounts()

```ts
listAccounts(): Promise<string[]>;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:40

#### Returns

`Promise`\<`string`[]\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.listAccounts
```

***

### listenerCount()

```ts
listenerCount(eventName?): number;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:151

#### Parameters

##### eventName?

`EventType`

#### Returns

`number`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.listenerCount
```

***

### listeners()

```ts
listeners(eventName?): Listener[];
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:152

#### Parameters

##### eventName?

`EventType`

#### Returns

`Listener`[]

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.listeners
```

***

### lookupAddress()

```ts
lookupAddress(address): Promise<null | string>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:142

#### Parameters

##### address

`string` | `Promise`\<`string`\>

#### Returns

`Promise`\<`null` \| `string`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.lookupAddress
```

***

### mintMockNFT()

```ts
mintMockNFT(config): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/test-helpers/LocalhostWeb3Provider.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/LocalhostWeb3Provider.ts#L41)

#### Parameters

##### config

[`BaseChainConfig`](../interfaces/BaseChainConfig.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### off()

```ts
off(eventName, listener?): this;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:153

#### Parameters

##### eventName

`EventType`

##### listener?

`Listener`

#### Returns

`this`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.off
```

***

### on()

```ts
on(eventName, listener): this;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:148

#### Parameters

##### eventName

`EventType`

##### listener

`Listener`

#### Returns

`this`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.on
```

***

### once()

```ts
once(eventName, listener): this;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:149

#### Parameters

##### eventName

`EventType`

##### listener

`Listener`

#### Returns

`this`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.once
```

***

### perform()

```ts
perform(method, params): Promise<any>;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:43

#### Parameters

##### method

`string`

##### params

`any`

#### Returns

`Promise`\<`any`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.perform
```

***

### poll()

```ts
poll(): Promise<void>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:96

#### Returns

`Promise`\<`void`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.poll
```

***

### prepareRequest()

```ts
prepareRequest(method, params): [string, any[]];
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:42

#### Parameters

##### method

`string`

##### params

`any`

#### Returns

\[`string`, `any`[]\]

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.prepareRequest
```

***

### removeAllListeners()

```ts
removeAllListeners(eventName?): this;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:154

#### Parameters

##### eventName?

`EventType`

#### Returns

`this`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.removeAllListeners
```

***

### removeListener()

```ts
removeListener(eventName, listener): Provider;
```

Defined in: node\_modules/@ethersproject/abstract-provider/lib/index.d.ts:150

#### Parameters

##### eventName

`EventType`

##### listener

`Listener`

#### Returns

`Provider`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.removeListener
```

***

### request()

```ts
request(__namedParameters): Promise<any>;
```

Defined in: [packages/web3/src/test-helpers/LocalhostWeb3Provider.ts:45](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/LocalhostWeb3Provider.ts#L45)

#### Parameters

##### \_\_namedParameters

###### method

`string`

###### params?

`unknown`[] = `...`

#### Returns

`Promise`\<`any`\>

***

### resetEventsBlock()

```ts
resetEventsBlock(blockNumber): void;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:97

#### Parameters

##### blockNumber

`number`

#### Returns

`void`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.resetEventsBlock
```

***

### resolveName()

```ts
resolveName(name): Promise<null | string>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:141

#### Parameters

##### name

`string` | `Promise`\<`string`\>

#### Returns

`Promise`\<`null` \| `string`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.resolveName
```

***

### send()

```ts
send(method, params): Promise<any>;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:41

#### Parameters

##### method

`string`

##### params

`any`[]

#### Returns

`Promise`\<`any`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.send
```

***

### sendTransaction()

```ts
sendTransaction(signedTransaction): Promise<TransactionResponse>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:124

#### Parameters

##### signedTransaction

`string` | `Promise`\<`string`\>

#### Returns

`Promise`\<`TransactionResponse`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.sendTransaction
```

***

### waitForTransaction()

```ts
waitForTransaction(
   transactionHash, 
   confirmations?, 
timeout?): Promise<TransactionReceipt>;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:108

#### Parameters

##### transactionHash

`string`

##### confirmations?

`number`

##### timeout?

`number`

#### Returns

`Promise`\<`TransactionReceipt`\>

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.waitForTransaction
```

***

### defaultUrl()

```ts
static defaultUrl(): string;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:35

#### Returns

`string`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.defaultUrl
```

***

### getFormatter()

```ts
static getFormatter(): Formatter;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:92

#### Returns

`Formatter`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getFormatter
```

***

### getNetwork()

```ts
static getNetwork(network): Network;
```

Defined in: node\_modules/@ethersproject/providers/lib/base-provider.d.ts:93

#### Parameters

##### network

`Networkish`

#### Returns

`Network`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.getNetwork
```

***

### hexlifyTransaction()

```ts
static hexlifyTransaction(transaction, allowExtra?): object;
```

Defined in: node\_modules/@ethersproject/providers/lib/json-rpc-provider.d.ts:47

#### Parameters

##### transaction

`TransactionRequest`

##### allowExtra?

#### Returns

`object`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.hexlifyTransaction
```

***

### isProvider()

```ts
static isProvider(value): value is Provider;
```

Defined in: node\_modules/@ethersproject/abstract-provider/lib/index.d.ts:154

#### Parameters

##### value

`any`

#### Returns

`value is Provider`

#### Inherited from

```ts
ethers.providers.JsonRpcProvider.isProvider
```
