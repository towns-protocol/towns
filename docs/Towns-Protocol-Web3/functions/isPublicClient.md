# Function: isPublicClient()

```ts
function isPublicClient(provider): provider is { account: undefined; batch?: { multicall?: boolean | { batchSize?: number; wait?: number } }; cacheTime: number; call: (parameters: CallParameters<undefined | Chain>) => Promise<CallReturnType>; ccipRead?: false | { request?: (parameters: CcipRequestParameters) => Promise<`0x${string}`> }; chain: undefined | Chain; createAccessList: (parameters: CreateAccessListParameters<undefined | Chain>) => Promise<{ accessList: AccessList; gasUsed: bigint }>; createBlockFilter: () => Promise<{ id: `0x${string}`; request: EIP1193RequestFn<readonly [{ Method: "eth_getFilterChanges"; Parameters: [filterId: `0x${string}`]; ReturnType: `0x${string}`[] | RpcLog[] }, { Method: "eth_getFilterLogs"; Parameters: [filterId: `0x${string}`]; ReturnType: RpcLog[] }, { Method: "eth_uninstallFilter"; Parameters: [filterId: `0x${string}`]; ReturnType: boolean }]>; type: "block" }>; createContractEventFilter: (args: CreateContractEventFilterParameters<abi, eventName, args, strict, fromBlock, toBlock>) => Promise<CreateContractEventFilterReturnType<abi, eventName, args, strict, fromBlock, toBlock>>; createEventFilter: (args?: CreateEventFilterParameters<abiEvent, abiEvents, strict, fromBlock, toBlock, _EventName, _Args>) => Promise<{ [K in string | number | symbol]: Filter<"event", abiEvents, _EventName, _Args, strict, fromBlock, toBlock>[K] }>; createPendingTransactionFilter: () => Promise<{ id: `0x${string}`; request: EIP1193RequestFn<readonly [{ Method: "eth_getFilterChanges"; Parameters: [filterId: `0x${string}`]; ReturnType: `0x${string}`[] | RpcLog[] }, { Method: "eth_getFilterLogs"; Parameters: [filterId: `0x${string}`]; ReturnType: RpcLog[] }, { Method: "eth_uninstallFilter"; Parameters: [filterId: `0x${string}`]; ReturnType: boolean }]>; type: "transaction" }>; estimateContractGas: (args: EstimateContractGasParameters<abi, functionName, args, chain>) => Promise<bigint>; estimateFeesPerGas: (args?: EstimateFeesPerGasParameters<undefined | Chain, chainOverride, type>) => Promise<EstimateFeesPerGasReturnType<type>>; estimateGas: (args: EstimateGasParameters<undefined | Chain>) => Promise<bigint>; estimateMaxPriorityFeePerGas: (args?: { chain: null | chainOverride }) => Promise<bigint>; extend: (fn: (client: Client<Transport, undefined | Chain, undefined, PublicRpcSchema, PublicActions<Transport, undefined | Chain>>) => client) => Client<Transport, undefined | Chain, undefined, PublicRpcSchema, { [K in string | number | symbol]: client[K] } & PublicActions<Transport, undefined | Chain>>; getBalance: (args: GetBalanceParameters) => Promise<bigint>; getBlobBaseFee: () => Promise<bigint>; getBlock: (args?: GetBlockParameters<includeTransactions, blockTag>) => Promise<{ baseFeePerGas: null | bigint; blobGasUsed: bigint; difficulty: bigint; excessBlobGas: bigint; extraData: `0x${string}`; gasLimit: bigint; gasUsed: bigint; hash: blockTag extends "pending" ? null : `0x${string}`; logsBloom: blockTag extends "pending" ? null : `0x${string}`; miner: `0x${string}`; mixHash: `0x${string}`; nonce: blockTag extends "pending" ? null : `0x${string}`; number: blockTag extends "pending" ? null : bigint; parentBeaconBlockRoot?: `0x${string}`; parentHash: `0x${string}`; receiptsRoot: `0x${string}`; sealFields: `0x${string}`[]; sha3Uncles: `0x${string}`; size: bigint; stateRoot: `0x${string}`; timestamp: bigint; totalDifficulty: null | bigint; transactions: includeTransactions extends true ? ({ accessList?: undefined; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : `0x${string}`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId?: number; from: `0x${string}`; gas: bigint; gasPrice: bigint; hash: `0x${string}`; input: `0x${string}`; maxFeePerBlobGas?: undefined; maxFeePerGas?: undefined; maxPriorityFeePerGas?: undefined; nonce: number; r: `0x${string}`; s: `0x${string}`; to: null | `0x${string}`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "legacy"; typeHex: null | `0x${string}`; v: bigint; value: bigint; yParity?: undefined } | { accessList: AccessList; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : `0x${string}`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: `0x${string}`; gas: bigint; gasPrice: bigint; hash: `0x${string}`; input: `0x${string}`; maxFeePerBlobGas?: undefined; maxFeePerGas?: undefined; maxPriorityFeePerGas?: undefined; nonce: number; r: `0x${string}`; s: `0x${string}`; to: null | `0x${string}`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip2930"; typeHex: null | `0x${string}`; v: bigint; value: bigint; yParity: number } | { accessList: AccessList; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : `0x${string}`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: `0x${string}`; gas: bigint; gasPrice?: undefined; hash: `0x${string}`; input: `0x${string}`; maxFeePerBlobGas?: undefined; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: `0x${string}`; s: `0x${string}`; to: null | `0x${string}`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip1559"; typeHex: null | `0x${string}`; v: bigint; value: bigint; yParity: number } | { accessList: AccessList; authorizationList?: undefined; blobVersionedHashes: readonly `0x${string}`[]; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : `0x${string}`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: `0x${string}`; gas: bigint; gasPrice?: undefined; hash: `0x${string}`; input: `0x${string}`; maxFeePerBlobGas: bigint; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: `0x${string}`; s: `0x${string}`; to: null | `0x${string}`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip4844"; typeHex: null | `0x${string}`; v: bigint; value: bigint; yParity: number } | { accessList: AccessList; authorizationList: SignedAuthorizationList; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : `0x${string}`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: `0x${string}`; gas: bigint; gasPrice?: undefined; hash: `0x${string}`; input: `0x${string}`; maxFeePerBlobGas?: undefined; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: `0x${string}`; s: `0x${string}`; to: null | `0x${string}`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip7702"; typeHex: null | `0x${string}`; v: bigint; value: bigint; yParity: number })[] : `0x${string}`[]; transactionsRoot: `0x${string}`; uncles: `0x${string}`[]; withdrawals?: Withdrawal[]; withdrawalsRoot?: `0x${string}` }>; getBlockNumber: (args?: GetBlockNumberParameters) => Promise<bigint>; getBlockTransactionCount: (args?: GetBlockTransactionCountParameters) => Promise<number>; getBytecode: (args: GetCodeParameters) => Promise<GetCodeReturnType>; getChainId: () => Promise<number>; getCode: (args: GetCodeParameters) => Promise<GetCodeReturnType>; getContractEvents: (args: GetContractEventsParameters<abi, eventName, strict, fromBlock, toBlock>) => Promise<GetContractEventsReturnType<abi, eventName, strict, fromBlock, toBlock>>; getEip712Domain: (args: GetEip712DomainParameters) => Promise<GetEip712DomainReturnType>; getEnsAddress: (args: { blockNumber?: bigint; blockTag?: BlockTag; coinType?: number; gatewayUrls?: string[]; name: string; strict?: boolean; universalResolverAddress?: `0x${string}` }) => Promise<GetEnsAddressReturnType>; getEnsAvatar: (args: { assetGatewayUrls?: AssetGatewayUrls; blockNumber?: bigint; blockTag?: BlockTag; gatewayUrls?: string[]; name: string; strict?: boolean; universalResolverAddress?: `0x${string}` }) => Promise<GetEnsAvatarReturnType>; getEnsName: (args: { address: `0x${string}`; blockNumber?: bigint; blockTag?: BlockTag; gatewayUrls?: string[]; strict?: boolean; universalResolverAddress?: `0x${string}` }) => Promise<GetEnsNameReturnType>; getEnsResolver: (args: { blockNumber?: bigint; blockTag?: BlockTag; name: string; universalResolverAddress?: `0x${string}` }) => Promise<`0x${string}`>; getEnsText: (args: { blockNumber?: bigint; blockTag?: BlockTag; gatewayUrls?: string[]; key: string; name: string; strict?: boolean; universalResolverAddress?: `0x${string}` }) => Promise<GetEnsTextReturnType>; getFeeHistory: (args: GetFeeHistoryParameters) => Promise<GetFeeHistoryReturnType>; getFilterChanges: (args: GetFilterChangesParameters<filterType, abi, eventName, strict, fromBlock, toBlock>) => Promise<GetFilterChangesReturnType<filterType, abi, eventName, strict, fromBlock, toBlock>>; getFilterLogs: (args: GetFilterLogsParameters<abi, eventName, strict, fromBlock, toBlock>) => Promise<GetFilterLogsReturnType<abi, eventName, strict, fromBlock, toBlock>>; getGasPrice: () => Promise<bigint>; getLogs: (args?: GetLogsParameters<abiEvent, abiEvents, strict, fromBlock, toBlock>) => Promise<GetLogsReturnType<abiEvent, abiEvents, strict, fromBlock, toBlock>>; getProof: (args: GetProofParameters) => Promise<GetProofReturnType>; getStorageAt: (args: GetStorageAtParameters) => Promise<GetStorageAtReturnType>; getTransaction: (args: GetTransactionParameters<blockTag>) => Promise<{ accessList?: undefined; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : `0x${string}`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId?: number; from: `0x${string}`; gas: bigint; gasPrice: bigint; hash: `0x${string}`; input: `0x${string}`; maxFeePerBlobGas?: undefined; maxFeePerGas?: undefined; maxPriorityFeePerGas?: undefined; nonce: number; r: `0x${string}`; s: `0x${string}`; to: null | `0x${string}`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "legacy"; typeHex: null | `0x${string}`; v: bigint; value: bigint; yParity?: undefined } | { accessList: AccessList; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : `0x${string}`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: `0x${string}`; gas: bigint; gasPrice: bigint; hash: `0x${string}`; input: `0x${string}`; maxFeePerBlobGas?: undefined; maxFeePerGas?: undefined; maxPriorityFeePerGas?: undefined; nonce: number; r: `0x${string}`; s: `0x${string}`; to: null | `0x${string}`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip2930"; typeHex: null | `0x${string}`; v: bigint; value: bigint; yParity: number } | { accessList: AccessList; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : `0x${string}`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: `0x${string}`; gas: bigint; gasPrice?: undefined; hash: `0x${string}`; input: `0x${string}`; maxFeePerBlobGas?: undefined; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: `0x${string}`; s: `0x${string}`; to: null | `0x${string}`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip1559"; typeHex: null | `0x${string}`; v: bigint; value: bigint; yParity: number } | { accessList: AccessList; authorizationList?: undefined; blobVersionedHashes: readonly `0x${string}`[]; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : `0x${string}`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: `0x${string}`; gas: bigint; gasPrice?: undefined; hash: `0x${string}`; input: `0x${string}`; maxFeePerBlobGas: bigint; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: `0x${string}`; s: `0x${string}`; to: null | `0x${string}`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip4844"; typeHex: null | `0x${string}`; v: bigint; value: bigint; yParity: number } | { accessList: AccessList; authorizationList: SignedAuthorizationList; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : `0x${string}`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: `0x${string}`; gas: bigint; gasPrice?: undefined; hash: `0x${string}`; input: `0x${string}`; maxFeePerBlobGas?: undefined; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: `0x${string}`; s: `0x${string}`; to: null | `0x${string}`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip7702"; typeHex: null | `0x${string}`; v: bigint; value: bigint; yParity: number }>; getTransactionConfirmations: (args: GetTransactionConfirmationsParameters<undefined | Chain>) => Promise<bigint>; getTransactionCount: (args: GetTransactionCountParameters) => Promise<number>; getTransactionReceipt: (args: GetTransactionReceiptParameters) => Promise<TransactionReceipt>; key: string; multicall: (args: MulticallParameters<contracts, allowFailure>) => Promise<MulticallReturnType<contracts, allowFailure>>; name: string; pollingInterval: number; prepareTransactionRequest: (args: PrepareTransactionRequestParameters<undefined | Chain, undefined | Account, chainOverride, accountOverride, request>) => Promise<{ [K in string | number | symbol]: (UnionRequiredBy<Extract<UnionOmit<(...), (...)> & ((...) extends (...) ? (...) : (...)) & ((...) extends (...) ? (...) : (...)), IsNever<(...)> extends true ? unknown : ExactPartial<(...)>> & { chainId?: number }, ParameterTypeToParameters<request["parameters"] extends readonly PrepareTransactionRequestParameterType[] ? any[any][number] : "chainId" | "type" | "gas" | "nonce" | "blobVersionedHashes" | "fees">> & (unknown extends request["kzg"] ? {} : Pick<request, "kzg">))[K] }>; readContract: (args: ReadContractParameters<abi, functionName, args>) => Promise<ReadContractReturnType<abi, functionName, args>>; request: EIP1193RequestFn<PublicRpcSchema>; sendRawTransaction: (args: SendRawTransactionParameters) => Promise<`0x${string}`>; simulate: (args: SimulateBlocksParameters<calls>) => Promise<SimulateBlocksReturnType<calls>>; simulateBlocks: (args: SimulateBlocksParameters<calls>) => Promise<SimulateBlocksReturnType<calls>>; simulateCalls: (args: SimulateCallsParameters<calls>) => Promise<SimulateCallsReturnType<calls>>; simulateContract: (args: SimulateContractParameters<abi, functionName, args, undefined | Chain, chainOverride, accountOverride>) => Promise<SimulateContractReturnType<abi, functionName, args, undefined | Chain, undefined | Account, chainOverride, accountOverride>>; transport: TransportConfig<string, EIP1193RequestFn> & Record<string, any>; type: string; uid: string; uninstallFilter: (args: UninstallFilterParameters) => Promise<boolean>; verifyMessage: (args: { address: `0x${string}`; blockNumber?: bigint; blockTag?: BlockTag; factory?: `0x${string}`; factoryData?: `0x${string}`; message: SignableMessage; signature: `0x${string}` | ByteArray | Signature; universalSignatureVerifierAddress?: `0x${string}` }) => Promise<boolean>; verifySiweMessage: (args: { address?: `0x${string}`; blockNumber?: bigint; blockTag?: BlockTag; domain?: string; message: string; nonce?: string; scheme?: string; signature: `0x${string}`; time?: Date }) => Promise<boolean>; verifyTypedData: (args: VerifyTypedDataParameters) => Promise<boolean>; waitForTransactionReceipt: (args: WaitForTransactionReceiptParameters<undefined | Chain>) => Promise<TransactionReceipt>; watchBlockNumber: (args: WatchBlockNumberParameters) => WatchBlockNumberReturnType; watchBlocks: (args: WatchBlocksParameters<Transport, undefined | Chain, includeTransactions, blockTag>) => WatchBlocksReturnType; watchContractEvent: (args: WatchContractEventParameters<abi, eventName, strict, Transport>) => WatchContractEventReturnType; watchEvent: (args: WatchEventParameters<abiEvent, abiEvents, strict, Transport>) => WatchEventReturnType; watchPendingTransactions: (args: WatchPendingTransactionsParameters<Transport>) => WatchPendingTransactionsReturnType };
```

Defined in: [packages/web3/src/utils/ut.ts:55](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/utils/ut.ts#L55)

## Parameters

### provider

`Provider` |

\{
`account`: `undefined`;
`batch?`: \{
`multicall?`:   \| `boolean`
\| \{
`batchSize?`: `number`;
`wait?`: `number`;
\};
\};
`cacheTime`: `number`;
`call`: (`parameters`) => `Promise`\<`CallReturnType`\>;
`ccipRead?`:   \| `false`
\| \{
`request?`: (`parameters`) => `Promise`\<`` `0x${string}` ``\>;
\};
`chain`: `undefined` \| `Chain`;
`createAccessList`: (`parameters`) => `Promise`\<\{
`accessList`: `AccessList`;
`gasUsed`: `bigint`;
\}\>;
`createBlockFilter`: () => `Promise`\<\{
`id`: `` `0x${string}` ``;
`request`: `EIP1193RequestFn`\<readonly \[\{
`Method`: `"eth_getFilterChanges"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `` `0x${(...)}` ``[] \| `RpcLog`[];
\}, \{
`Method`: `"eth_getFilterLogs"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `RpcLog`[];
\}, \{
`Method`: `"eth_uninstallFilter"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `boolean`;
\}\]\>;
`type`: `"block"`;
\}\>;
`createContractEventFilter`: \<`abi`, `eventName`, `args`, `strict`, `fromBlock`, `toBlock`\>(`args`) => `Promise`\<`CreateContractEventFilterReturnType`\<`abi`, `eventName`, `args`, `strict`, `fromBlock`, `toBlock`\>\>;
`createEventFilter`: \<`abiEvent`, `abiEvents`, `strict`, `fromBlock`, `toBlock`, `_EventName`, `_Args`\>(`args?`) => `Promise`\<\{ \[K in string \| number \| symbol\]: Filter\<"event", abiEvents, \_EventName, \_Args, strict, fromBlock, toBlock\>\[K\] \}\>;
`createPendingTransactionFilter`: () => `Promise`\<\{
`id`: `` `0x${string}` ``;
`request`: `EIP1193RequestFn`\<readonly \[\{
`Method`: `"eth_getFilterChanges"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `` `0x${(...)}` ``[] \| `RpcLog`[];
\}, \{
`Method`: `"eth_getFilterLogs"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `RpcLog`[];
\}, \{
`Method`: `"eth_uninstallFilter"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `boolean`;
\}\]\>;
`type`: `"transaction"`;
\}\>;
`estimateContractGas`: \<`chain`, `abi`, `functionName`, `args`\>(`args`) => `Promise`\<`bigint`\>;
`estimateFeesPerGas`: \<`chainOverride`, `type`\>(`args?`) => `Promise`\<`EstimateFeesPerGasReturnType`\<`type`\>\>;
`estimateGas`: (`args`) => `Promise`\<`bigint`\>;
`estimateMaxPriorityFeePerGas`: \<`chainOverride`\>(`args?`) => `Promise`\<`bigint`\>;
`extend`: \<`client`\>(`fn`) => `Client`\<`Transport`, `undefined` \| `Chain`, `undefined`, `PublicRpcSchema`, \{ \[K in string \| number \| symbol\]: client\[K\] \} & `PublicActions`\<`Transport`, `undefined` \| `Chain`\>\>;
`getBalance`: (`args`) => `Promise`\<`bigint`\>;
`getBlobBaseFee`: () => `Promise`\<`bigint`\>;
`getBlock`: \<`includeTransactions`, `blockTag`\>(`args?`) => `Promise`\<\{
`baseFeePerGas`: `null` \| `bigint`;
`blobGasUsed`: `bigint`;
`difficulty`: `bigint`;
`excessBlobGas`: `bigint`;
`extraData`: `` `0x${string}` ``;
`gasLimit`: `bigint`;
`gasUsed`: `bigint`;
`hash`: `blockTag` *extends* `"pending"` ? `null` : `` `0x${string}` ``;
`logsBloom`: `blockTag` *extends* `"pending"` ? `null` : `` `0x${string}` ``;
`miner`: `` `0x${string}` ``;
`mixHash`: `` `0x${string}` ``;
`nonce`: `blockTag` *extends* `"pending"` ? `null` : `` `0x${string}` ``;
`number`: `blockTag` *extends* `"pending"` ? `null` : `bigint`;
`parentBeaconBlockRoot?`: `` `0x${string}` ``;
`parentHash`: `` `0x${string}` ``;
`receiptsRoot`: `` `0x${string}` ``;
`sealFields`: `` `0x${string}` ``[];
`sha3Uncles`: `` `0x${string}` ``;
`size`: `bigint`;
`stateRoot`: `` `0x${string}` ``;
`timestamp`: `bigint`;
`totalDifficulty`: `null` \| `bigint`;
`transactions`: `includeTransactions` *extends* `true` ? (
\| \{
`accessList?`: `undefined`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `` `0x${(...)}` ``;
`blockNumber`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `bigint`;
`chainId?`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice`: `bigint`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas?`: `undefined`;
`maxPriorityFeePerGas?`: `undefined`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${(...)}` ``;
`transactionIndex`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `number`;
`type`: `"legacy"`;
`typeHex`: `null` \| `` `0x${(...)}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity?`: `undefined`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `` `0x${(...)}` ``;
`blockNumber`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice`: `bigint`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas?`: `undefined`;
`maxPriorityFeePerGas?`: `undefined`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${(...)}` ``;
`transactionIndex`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `number`;
`type`: `"eip2930"`;
`typeHex`: `null` \| `` `0x${(...)}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `` `0x${(...)}` ``;
`blockNumber`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${(...)}` ``;
`transactionIndex`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `number`;
`type`: `"eip1559"`;
`typeHex`: `null` \| `` `0x${(...)}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes`: readonly `` `0x${(...)}` ``[];
`blockHash`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `` `0x${(...)}` ``;
`blockNumber`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas`: `bigint`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${(...)}` ``;
`transactionIndex`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `number`;
`type`: `"eip4844"`;
`typeHex`: `null` \| `` `0x${(...)}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList`: `SignedAuthorizationList`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `` `0x${(...)}` ``;
`blockNumber`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${(...)}` ``;
`transactionIndex`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `number`;
`type`: `"eip7702"`;
`typeHex`: `null` \| `` `0x${(...)}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\})[] : `` `0x${string}` ``[];
`transactionsRoot`: `` `0x${string}` ``;
`uncles`: `` `0x${string}` ``[];
`withdrawals?`: `Withdrawal`[];
`withdrawalsRoot?`: `` `0x${string}` ``;
\}\>;
`getBlockNumber`: (`args?`) => `Promise`\<`bigint`\>;
`getBlockTransactionCount`: (`args?`) => `Promise`\<`number`\>;
`getBytecode`: (`args`) => `Promise`\<`GetCodeReturnType`\>;
`getChainId`: () => `Promise`\<`number`\>;
`getCode`: (`args`) => `Promise`\<`GetCodeReturnType`\>;
`getContractEvents`: \<`abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>(`args`) => `Promise`\<`GetContractEventsReturnType`\<`abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>\>;
`getEip712Domain`: (`args`) => `Promise`\<`GetEip712DomainReturnType`\>;
`getEnsAddress`: (`args`) => `Promise`\<`GetEnsAddressReturnType`\>;
`getEnsAvatar`: (`args`) => `Promise`\<`GetEnsAvatarReturnType`\>;
`getEnsName`: (`args`) => `Promise`\<`GetEnsNameReturnType`\>;
`getEnsResolver`: (`args`) => `Promise`\<`` `0x${string}` ``\>;
`getEnsText`: (`args`) => `Promise`\<`GetEnsTextReturnType`\>;
`getFeeHistory`: (`args`) => `Promise`\<`GetFeeHistoryReturnType`\>;
`getFilterChanges`: \<`filterType`, `abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>(`args`) => `Promise`\<`GetFilterChangesReturnType`\<`filterType`, `abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>\>;
`getFilterLogs`: \<`abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>(`args`) => `Promise`\<`GetFilterLogsReturnType`\<`abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>\>;
`getGasPrice`: () => `Promise`\<`bigint`\>;
`getLogs`: \<`abiEvent`, `abiEvents`, `strict`, `fromBlock`, `toBlock`\>(`args?`) => `Promise`\<`GetLogsReturnType`\<`abiEvent`, `abiEvents`, `strict`, `fromBlock`, `toBlock`\>\>;
`getProof`: (`args`) => `Promise`\<`GetProofReturnType`\>;
`getStorageAt`: (`args`) => `Promise`\<`GetStorageAtReturnType`\>;
`getTransaction`: \<`blockTag`\>(`args`) => `Promise`\<
\| \{
`accessList?`: `undefined`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `` `0x${string}` ``;
`blockNumber`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `bigint`;
`chainId?`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice`: `bigint`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas?`: `undefined`;
`maxPriorityFeePerGas?`: `undefined`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${string}` ``;
`transactionIndex`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `number`;
`type`: `"legacy"`;
`typeHex`: `null` \| `` `0x${string}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity?`: `undefined`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `` `0x${string}` ``;
`blockNumber`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice`: `bigint`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas?`: `undefined`;
`maxPriorityFeePerGas?`: `undefined`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${string}` ``;
`transactionIndex`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `number`;
`type`: `"eip2930"`;
`typeHex`: `null` \| `` `0x${string}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `` `0x${string}` ``;
`blockNumber`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${string}` ``;
`transactionIndex`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `number`;
`type`: `"eip1559"`;
`typeHex`: `null` \| `` `0x${string}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes`: readonly `` `0x${string}` ``[];
`blockHash`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `` `0x${string}` ``;
`blockNumber`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas`: `bigint`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${string}` ``;
`transactionIndex`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `number`;
`type`: `"eip4844"`;
`typeHex`: `null` \| `` `0x${string}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList`: `SignedAuthorizationList`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `` `0x${string}` ``;
`blockNumber`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${string}` ``;
`transactionIndex`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `number`;
`type`: `"eip7702"`;
`typeHex`: `null` \| `` `0x${string}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}\>;
`getTransactionConfirmations`: (`args`) => `Promise`\<`bigint`\>;
`getTransactionCount`: (`args`) => `Promise`\<`number`\>;
`getTransactionReceipt`: (`args`) => `Promise`\<`TransactionReceipt`\>;
`key`: `string`;
`multicall`: \<`contracts`, `allowFailure`\>(`args`) => `Promise`\<`MulticallReturnType`\<`contracts`, `allowFailure`\>\>;
`name`: `string`;
`pollingInterval`: `number`;
`prepareTransactionRequest`: \<`request`, `chainOverride`, `accountOverride`\>(`args`) => `Promise`\<\{ \[K in string \| number \| symbol\]: (UnionRequiredBy\<Extract\<(...) & (...) & (...), (...) extends (...) ? (...) : (...)\> & \{ chainId?: (...) \| (...) \}, ParameterTypeToParameters\<(...)\[(...)\] extends readonly (...)\[\] ? (...)\[(...)\] : (...) \| (...) \| (...) \| (...) \| (...) \| (...)\>\> & (unknown extends request\["kzg"\] ? \{\} : Pick\<request, "kzg"\>))\[K\] \}\>;
`readContract`: \<`abi`, `functionName`, `args`\>(`args`) => `Promise`\<`ReadContractReturnType`\<`abi`, `functionName`, `args`\>\>;
`request`: `EIP1193RequestFn`\<`PublicRpcSchema`\>;
`sendRawTransaction`: (`args`) => `Promise`\<`` `0x${string}` ``\>;
`simulate`: \<`calls`\>(`args`) => `Promise`\<`SimulateBlocksReturnType`\<`calls`\>\>;
`simulateBlocks`: \<`calls`\>(`args`) => `Promise`\<`SimulateBlocksReturnType`\<`calls`\>\>;
`simulateCalls`: \<`calls`\>(`args`) => `Promise`\<`SimulateCallsReturnType`\<`calls`\>\>;
`simulateContract`: \<`abi`, `functionName`, `args`, `chainOverride`, `accountOverride`\>(`args`) => `Promise`\<`SimulateContractReturnType`\<`abi`, `functionName`, `args`, `undefined` \| `Chain`, `undefined` \| `Account`, `chainOverride`, `accountOverride`\>\>;
`transport`: `TransportConfig`\<`string`, `EIP1193RequestFn`\> & `Record`\<`string`, `any`\>;
`type`: `string`;
`uid`: `string`;
`uninstallFilter`: (`args`) => `Promise`\<`boolean`\>;
`verifyMessage`: (`args`) => `Promise`\<`boolean`\>;
`verifySiweMessage`: (`args`) => `Promise`\<`boolean`\>;
`verifyTypedData`: (`args`) => `Promise`\<`boolean`\>;
`waitForTransactionReceipt`: (`args`) => `Promise`\<`TransactionReceipt`\>;
`watchBlockNumber`: (`args`) => `WatchBlockNumberReturnType`;
`watchBlocks`: \<`includeTransactions`, `blockTag`\>(`args`) => `WatchBlocksReturnType`;
`watchContractEvent`: \<`abi`, `eventName`, `strict`\>(`args`) => `WatchContractEventReturnType`;
`watchEvent`: \<`abiEvent`, `abiEvents`, `strict`\>(`args`) => `WatchEventReturnType`;
`watchPendingTransactions`: (`args`) => `WatchPendingTransactionsReturnType`;
\}

#### account

`undefined`

The Account of the Client.

#### batch?

\{
`multicall?`:   \| `boolean`
\| \{
`batchSize?`: `number`;
`wait?`: `number`;
\};
\}

Flags for batch settings.

#### batch.multicall?

\| `boolean`
\| \{
`batchSize?`: `number`;
`wait?`: `number`;
\}

Toggle to enable `eth_call` multicall aggregation.

#### cacheTime

`number`

Time (in ms) that cached data will remain in memory.

#### call

(`parameters`) => `Promise`\<`CallReturnType`\>

Executes a new message call immediately without submitting a transaction to the network.

- Docs: https://viem.sh/docs/actions/public/call
- JSON-RPC Methods: [`eth_call`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_call)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const data = await client.call({
account: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
data: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
})
```

#### ccipRead?

\| `false`
\| \{
`request?`: (`parameters`) => `Promise`\<`` `0x${string}` ``\>;
\}

[CCIP Read](https://eips.ethereum.org/EIPS/eip-3668) configuration.

#### chain

`undefined` \| `Chain`

Chain for the client.

#### createAccessList

(`parameters`) => `Promise`\<\{
`accessList`: `AccessList`;
`gasUsed`: `bigint`;
\}\>

Creates an EIP-2930 access list that you can include in a transaction.

- Docs: https://viem.sh/docs/actions/public/createAccessList
- JSON-RPC Methods: `eth_createAccessList`

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})

const data = await client.createAccessList({
data: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
})
```

#### createBlockFilter

() => `Promise`\<\{
`id`: `` `0x${string}` ``;
`request`: `EIP1193RequestFn`\<readonly \[\{
`Method`: `"eth_getFilterChanges"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `` `0x${(...)}` ``[] \| `RpcLog`[];
\}, \{
`Method`: `"eth_getFilterLogs"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `RpcLog`[];
\}, \{
`Method`: `"eth_uninstallFilter"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `boolean`;
\}\]\>;
`type`: `"block"`;
\}\>

Creates a Filter to listen for new block hashes that can be used with [`getFilterChanges`](https://viem.sh/docs/actions/public/getFilterChanges).

- Docs: https://viem.sh/docs/actions/public/createBlockFilter
- JSON-RPC Methods: [`eth_newBlockFilter`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_newBlockFilter)

**Example**

```ts
import { createPublicClient, createBlockFilter, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const filter = await createBlockFilter(client)
// { id: "0x345a6572337856574a76364e457a4366", type: 'block' }
```

#### createContractEventFilter

\<`abi`, `eventName`, `args`, `strict`, `fromBlock`, `toBlock`\>(`args`) => `Promise`\<`CreateContractEventFilterReturnType`\<`abi`, `eventName`, `args`, `strict`, `fromBlock`, `toBlock`\>\>

Creates a Filter to retrieve event logs that can be used with [`getFilterChanges`](https://viem.sh/docs/actions/public/getFilterChanges) or [`getFilterLogs`](https://viem.sh/docs/actions/public/getFilterLogs).

- Docs: https://viem.sh/docs/contract/createContractEventFilter

**Example**

```ts
import { createPublicClient, http, parseAbi } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const filter = await client.createContractEventFilter({
abi: parseAbi(['event Transfer(address indexed, address indexed, uint256)']),
})
```

#### createEventFilter

\<`abiEvent`, `abiEvents`, `strict`, `fromBlock`, `toBlock`, `_EventName`, `_Args`\>(`args?`) => `Promise`\<\{ \[K in string \| number \| symbol\]: Filter\<"event", abiEvents, \_EventName, \_Args, strict, fromBlock, toBlock\>\[K\] \}\>

Creates a [`Filter`](https://viem.sh/docs/glossary/types#filter) to listen for new events that can be used with [`getFilterChanges`](https://viem.sh/docs/actions/public/getFilterChanges).

- Docs: https://viem.sh/docs/actions/public/createEventFilter
- JSON-RPC Methods: [`eth_newFilter`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_newfilter)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const filter = await client.createEventFilter({
address: '0xfba3912ca04dd458c843e2ee08967fc04f3579c2',
})
```

#### createPendingTransactionFilter

() => `Promise`\<\{
`id`: `` `0x${string}` ``;
`request`: `EIP1193RequestFn`\<readonly \[\{
`Method`: `"eth_getFilterChanges"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `` `0x${(...)}` ``[] \| `RpcLog`[];
\}, \{
`Method`: `"eth_getFilterLogs"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `RpcLog`[];
\}, \{
`Method`: `"eth_uninstallFilter"`;
`Parameters`: \[`` `0x${string}` ``\];
`ReturnType`: `boolean`;
\}\]\>;
`type`: `"transaction"`;
\}\>

Creates a Filter to listen for new pending transaction hashes that can be used with [`getFilterChanges`](https://viem.sh/docs/actions/public/getFilterChanges).

- Docs: https://viem.sh/docs/actions/public/createPendingTransactionFilter
- JSON-RPC Methods: [`eth_newPendingTransactionFilter`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_newpendingtransactionfilter)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const filter = await client.createPendingTransactionFilter()
// { id: "0x345a6572337856574a76364e457a4366", type: 'transaction' }
```

#### estimateContractGas

\<`chain`, `abi`, `functionName`, `args`\>(`args`) => `Promise`\<`bigint`\>

Estimates the gas required to successfully execute a contract write function call.

- Docs: https://viem.sh/docs/contract/estimateContractGas

**Remarks**

Internally, uses a [Public Client](https://viem.sh/docs/clients/public) to call the [`estimateGas` action](https://viem.sh/docs/actions/public/estimateGas) with [ABI-encoded `data`](https://viem.sh/docs/contract/encodeFunctionData).

**Example**

```ts
import { createPublicClient, http, parseAbi } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const gas = await client.estimateContractGas({
address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
abi: parseAbi(['function mint() public']),
functionName: 'mint',
account: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
})
```

#### estimateFeesPerGas

\<`chainOverride`, `type`\>(`args?`) => `Promise`\<`EstimateFeesPerGasReturnType`\<`type`\>\>

Returns an estimate for the fees per gas for a transaction to be included
in the next block.

- Docs: https://viem.sh/docs/actions/public/estimateFeesPerGas

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const maxPriorityFeePerGas = await client.estimateFeesPerGas()
// { maxFeePerGas: ..., maxPriorityFeePerGas: ... }
```

#### estimateGas

(`args`) => `Promise`\<`bigint`\>

Estimates the gas necessary to complete a transaction without submitting it to the network.

- Docs: https://viem.sh/docs/actions/public/estimateGas
- JSON-RPC Methods: [`eth_estimateGas`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_estimategas)

**Example**

```ts
import { createPublicClient, http, parseEther } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const gasEstimate = await client.estimateGas({
account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
value: parseEther('1'),
})
```

#### estimateMaxPriorityFeePerGas

\<`chainOverride`\>(`args?`) => `Promise`\<`bigint`\>

Returns an estimate for the max priority fee per gas (in wei) for a transaction
to be included in the next block.

- Docs: https://viem.sh/docs/actions/public/estimateMaxPriorityFeePerGas

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const maxPriorityFeePerGas = await client.estimateMaxPriorityFeePerGas()
// 10000000n
```

#### extend

\<`client`\>(`fn`) => `Client`\<`Transport`, `undefined` \| `Chain`, `undefined`, `PublicRpcSchema`, \{ \[K in string \| number \| symbol\]: client\[K\] \} & `PublicActions`\<`Transport`, `undefined` \| `Chain`\>\>

#### getBalance

(`args`) => `Promise`\<`bigint`\>

Returns the balance of an address in wei.

- Docs: https://viem.sh/docs/actions/public/getBalance
- JSON-RPC Methods: [`eth_getBalance`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getbalance)

**Remarks**

You can convert the balance to ether units with [`formatEther`](https://viem.sh/docs/utilities/formatEther).

```ts
const balance = await getBalance(client, {
address: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
blockTag: 'safe'
})
const balanceAsEther = formatEther(balance)
// "6.942"
```

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const balance = await client.getBalance({
address: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
})
// 10000000000000000000000n (wei)
```

#### getBlobBaseFee

() => `Promise`\<`bigint`\>

Returns the base fee per blob gas in wei.

- Docs: https://viem.sh/docs/actions/public/getBlobBaseFee
- JSON-RPC Methods: [`eth_blobBaseFee`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_blobBaseFee)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { getBlobBaseFee } from 'viem/public'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const blobBaseFee = await client.getBlobBaseFee()
```

#### getBlock

\<`includeTransactions`, `blockTag`\>(`args?`) => `Promise`\<\{
`baseFeePerGas`: `null` \| `bigint`;
`blobGasUsed`: `bigint`;
`difficulty`: `bigint`;
`excessBlobGas`: `bigint`;
`extraData`: `` `0x${string}` ``;
`gasLimit`: `bigint`;
`gasUsed`: `bigint`;
`hash`: `blockTag` *extends* `"pending"` ? `null` : `` `0x${string}` ``;
`logsBloom`: `blockTag` *extends* `"pending"` ? `null` : `` `0x${string}` ``;
`miner`: `` `0x${string}` ``;
`mixHash`: `` `0x${string}` ``;
`nonce`: `blockTag` *extends* `"pending"` ? `null` : `` `0x${string}` ``;
`number`: `blockTag` *extends* `"pending"` ? `null` : `bigint`;
`parentBeaconBlockRoot?`: `` `0x${string}` ``;
`parentHash`: `` `0x${string}` ``;
`receiptsRoot`: `` `0x${string}` ``;
`sealFields`: `` `0x${string}` ``[];
`sha3Uncles`: `` `0x${string}` ``;
`size`: `bigint`;
`stateRoot`: `` `0x${string}` ``;
`timestamp`: `bigint`;
`totalDifficulty`: `null` \| `bigint`;
`transactions`: `includeTransactions` *extends* `true` ? (
\| \{
`accessList?`: `undefined`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `` `0x${(...)}` ``;
`blockNumber`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `bigint`;
`chainId?`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice`: `bigint`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas?`: `undefined`;
`maxPriorityFeePerGas?`: `undefined`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${(...)}` ``;
`transactionIndex`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `number`;
`type`: `"legacy"`;
`typeHex`: `null` \| `` `0x${(...)}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity?`: `undefined`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `` `0x${(...)}` ``;
`blockNumber`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice`: `bigint`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas?`: `undefined`;
`maxPriorityFeePerGas?`: `undefined`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${(...)}` ``;
`transactionIndex`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `number`;
`type`: `"eip2930"`;
`typeHex`: `null` \| `` `0x${(...)}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `` `0x${(...)}` ``;
`blockNumber`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${(...)}` ``;
`transactionIndex`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `number`;
`type`: `"eip1559"`;
`typeHex`: `null` \| `` `0x${(...)}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes`: readonly `` `0x${(...)}` ``[];
`blockHash`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `` `0x${(...)}` ``;
`blockNumber`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas`: `bigint`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${(...)}` ``;
`transactionIndex`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `number`;
`type`: `"eip4844"`;
`typeHex`: `null` \| `` `0x${(...)}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList`: `SignedAuthorizationList`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `` `0x${(...)}` ``;
`blockNumber`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${(...)}` ``;
`transactionIndex`: ... *extends* ... ? ... : ... *extends* `true` ? `null` : `number`;
`type`: `"eip7702"`;
`typeHex`: `null` \| `` `0x${(...)}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\})[] : `` `0x${string}` ``[];
`transactionsRoot`: `` `0x${string}` ``;
`uncles`: `` `0x${string}` ``[];
`withdrawals?`: `Withdrawal`[];
`withdrawalsRoot?`: `` `0x${string}` ``;
\}\>

Returns information about a block at a block number, hash, or tag.

- Docs: https://viem.sh/docs/actions/public/getBlock
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/blocks_fetching-blocks
- JSON-RPC Methods:
- Calls [`eth_getBlockByNumber`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getblockbynumber) for `blockNumber` & `blockTag`.
- Calls [`eth_getBlockByHash`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getblockbyhash) for `blockHash`.

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const block = await client.getBlock()
```

#### getBlockNumber

(`args?`) => `Promise`\<`bigint`\>

Returns the number of the most recent block seen.

- Docs: https://viem.sh/docs/actions/public/getBlockNumber
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/blocks_fetching-blocks
- JSON-RPC Methods: [`eth_blockNumber`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_blocknumber)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const blockNumber = await client.getBlockNumber()
// 69420n
```

#### getBlockTransactionCount

(`args?`) => `Promise`\<`number`\>

Returns the number of Transactions at a block number, hash, or tag.

- Docs: https://viem.sh/docs/actions/public/getBlockTransactionCount
- JSON-RPC Methods:
- Calls [`eth_getBlockTransactionCountByNumber`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getblocktransactioncountbynumber) for `blockNumber` & `blockTag`.
- Calls [`eth_getBlockTransactionCountByHash`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getblocktransactioncountbyhash) for `blockHash`.

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const count = await client.getBlockTransactionCount()
```

#### getBytecode

(`args`) => `Promise`\<`GetCodeReturnType`\>

**Deprecated**

Use `getCode` instead.

#### getChainId

() => `Promise`\<`number`\>

Returns the chain ID associated with the current network.

- Docs: https://viem.sh/docs/actions/public/getChainId
- JSON-RPC Methods: [`eth_chainId`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_chainid)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const chainId = await client.getChainId()
// 1
```

#### getCode

(`args`) => `Promise`\<`GetCodeReturnType`\>

Retrieves the bytecode at an address.

- Docs: https://viem.sh/docs/contract/getCode
- JSON-RPC Methods: [`eth_getCode`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getcode)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const code = await client.getCode({
address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
})
```

#### getContractEvents

\<`abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>(`args`) => `Promise`\<`GetContractEventsReturnType`\<`abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>\>

Returns a list of event logs emitted by a contract.

- Docs: https://viem.sh/docs/actions/public/getContractEvents
- JSON-RPC Methods: [`eth_getLogs`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getlogs)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { wagmiAbi } from './abi'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const logs = await client.getContractEvents(client, {
address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
abi: wagmiAbi,
eventName: 'Transfer'
})
```

#### getEip712Domain

(`args`) => `Promise`\<`GetEip712DomainReturnType`\>

Reads the EIP-712 domain from a contract, based on the ERC-5267 specification.

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})

const domain = await client.getEip712Domain({
address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
})
// {
//   domain: {
//     name: 'ExampleContract',
//     version: '1',
//     chainId: 1,
//     verifyingContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
//   },
//   fields: '0x0f',
//   extensions: [],
// }
```

#### getEnsAddress

(`args`) => `Promise`\<`GetEnsAddressReturnType`\>

Gets address for ENS name.

- Docs: https://viem.sh/docs/ens/actions/getEnsAddress
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/ens

**Remarks**

Calls `resolve(bytes, bytes)` on ENS Universal Resolver Contract.

Since ENS names prohibit certain forbidden characters (e.g. underscore) and have other validation rules, you likely want to [normalize ENS names](https://docs.ens.domains/contract-api-reference/name-processing#normalising-names) with [UTS-46 normalization](https://unicode.org/reports/tr46) before passing them to `getEnsAddress`. You can use the built-in [`normalize`](https://viem.sh/docs/ens/utilities/normalize) function for this.

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const ensAddress = await client.getEnsAddress({
name: normalize('wevm.eth'),
})
// '0xd2135CfB216b74109775236E36d4b433F1DF507B'
```

#### getEnsAvatar

(`args`) => `Promise`\<`GetEnsAvatarReturnType`\>

Gets the avatar of an ENS name.

- Docs: https://viem.sh/docs/ens/actions/getEnsAvatar
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/ens

**Remarks**

Calls [`getEnsText`](https://viem.sh/docs/ens/actions/getEnsText) with `key` set to `'avatar'`.

Since ENS names prohibit certain forbidden characters (e.g. underscore) and have other validation rules, you likely want to [normalize ENS names](https://docs.ens.domains/contract-api-reference/name-processing#normalising-names) with [UTS-46 normalization](https://unicode.org/reports/tr46) before passing them to `getEnsAddress`. You can use the built-in [`normalize`](https://viem.sh/docs/ens/utilities/normalize) function for this.

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const ensAvatar = await client.getEnsAvatar({
name: normalize('wevm.eth'),
})
// 'https://ipfs.io/ipfs/Qma8mnp6xV3J2cRNf3mTth5C8nV11CAnceVinc3y8jSbio'
```

#### getEnsName

(`args`) => `Promise`\<`GetEnsNameReturnType`\>

Gets primary name for specified address.

- Docs: https://viem.sh/docs/ens/actions/getEnsName
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/ens

**Remarks**

Calls `reverse(bytes)` on ENS Universal Resolver Contract to "reverse resolve" the address to the primary ENS name.

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const ensName = await client.getEnsName({
address: '0xd2135CfB216b74109775236E36d4b433F1DF507B',
})
// 'wevm.eth'
```

#### getEnsResolver

(`args`) => `Promise`\<`` `0x${string}` ``\>

Gets resolver for ENS name.

- Docs: https://viem.sh/docs/ens/actions/getEnsResolver
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/ens

**Remarks**

Calls `findResolver(bytes)` on ENS Universal Resolver Contract to retrieve the resolver of an ENS name.

Since ENS names prohibit certain forbidden characters (e.g. underscore) and have other validation rules, you likely want to [normalize ENS names](https://docs.ens.domains/contract-api-reference/name-processing#normalising-names) with [UTS-46 normalization](https://unicode.org/reports/tr46) before passing them to `getEnsAddress`. You can use the built-in [`normalize`](https://viem.sh/docs/ens/utilities/normalize) function for this.

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const resolverAddress = await client.getEnsResolver({
name: normalize('wevm.eth'),
})
// '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41'
```

#### getEnsText

(`args`) => `Promise`\<`GetEnsTextReturnType`\>

Gets a text record for specified ENS name.

- Docs: https://viem.sh/docs/ens/actions/getEnsResolver
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/ens

**Remarks**

Calls `resolve(bytes, bytes)` on ENS Universal Resolver Contract.

Since ENS names prohibit certain forbidden characters (e.g. underscore) and have other validation rules, you likely want to [normalize ENS names](https://docs.ens.domains/contract-api-reference/name-processing#normalising-names) with [UTS-46 normalization](https://unicode.org/reports/tr46) before passing them to `getEnsAddress`. You can use the built-in [`normalize`](https://viem.sh/docs/ens/utilities/normalize) function for this.

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const twitterRecord = await client.getEnsText({
name: normalize('wevm.eth'),
key: 'com.twitter',
})
// 'wevm_dev'
```

#### getFeeHistory

(`args`) => `Promise`\<`GetFeeHistoryReturnType`\>

Returns a collection of historical gas information.

- Docs: https://viem.sh/docs/actions/public/getFeeHistory
- JSON-RPC Methods: [`eth_feeHistory`](https://docs.alchemy.com/reference/eth-feehistory)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const feeHistory = await client.getFeeHistory({
blockCount: 4,
rewardPercentiles: [25, 75],
})
```

#### getFilterChanges

\<`filterType`, `abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>(`args`) => `Promise`\<`GetFilterChangesReturnType`\<`filterType`, `abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>\>

Returns a list of logs or hashes based on a [Filter](/docs/glossary/terms#filter) since the last time it was called.

- Docs: https://viem.sh/docs/actions/public/getFilterChanges
- JSON-RPC Methods: [`eth_getFilterChanges`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getfilterchanges)

**Remarks**

A Filter can be created from the following actions:

- [`createBlockFilter`](https://viem.sh/docs/actions/public/createBlockFilter)
- [`createContractEventFilter`](https://viem.sh/docs/contract/createContractEventFilter)
- [`createEventFilter`](https://viem.sh/docs/actions/public/createEventFilter)
- [`createPendingTransactionFilter`](https://viem.sh/docs/actions/public/createPendingTransactionFilter)

Depending on the type of filter, the return value will be different:

- If the filter was created with `createContractEventFilter` or `createEventFilter`, it returns a list of logs.
- If the filter was created with `createPendingTransactionFilter`, it returns a list of transaction hashes.
- If the filter was created with `createBlockFilter`, it returns a list of block hashes.

**Examples**

```ts
// Blocks
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const filter = await client.createBlockFilter()
const hashes = await client.getFilterChanges({ filter })
```

```ts
// Contract Events
import { createPublicClient, http, parseAbi } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const filter = await client.createContractEventFilter({
address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
abi: parseAbi(['event Transfer(address indexed, address indexed, uint256)']),
eventName: 'Transfer',
})
const logs = await client.getFilterChanges({ filter })
```

```ts
// Raw Events
import { createPublicClient, http, parseAbiItem } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const filter = await client.createEventFilter({
address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
event: parseAbiItem('event Transfer(address indexed, address indexed, uint256)'),
})
const logs = await client.getFilterChanges({ filter })
```

```ts
// Transactions
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const filter = await client.createPendingTransactionFilter()
const hashes = await client.getFilterChanges({ filter })
```

#### getFilterLogs

\<`abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>(`args`) => `Promise`\<`GetFilterLogsReturnType`\<`abi`, `eventName`, `strict`, `fromBlock`, `toBlock`\>\>

Returns a list of event logs since the filter was created.

- Docs: https://viem.sh/docs/actions/public/getFilterLogs
- JSON-RPC Methods: [`eth_getFilterLogs`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getfilterlogs)

**Remarks**

`getFilterLogs` is only compatible with **event filters**.

**Example**

```ts
import { createPublicClient, http, parseAbiItem } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const filter = await client.createEventFilter({
address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
event: parseAbiItem('event Transfer(address indexed, address indexed, uint256)'),
})
const logs = await client.getFilterLogs({ filter })
```

#### getGasPrice

() => `Promise`\<`bigint`\>

Returns the current price of gas (in wei).

- Docs: https://viem.sh/docs/actions/public/getGasPrice
- JSON-RPC Methods: [`eth_gasPrice`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_gasprice)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const gasPrice = await client.getGasPrice()
```

#### getLogs

\<`abiEvent`, `abiEvents`, `strict`, `fromBlock`, `toBlock`\>(`args?`) => `Promise`\<`GetLogsReturnType`\<`abiEvent`, `abiEvents`, `strict`, `fromBlock`, `toBlock`\>\>

Returns a list of event logs matching the provided parameters.

- Docs: https://viem.sh/docs/actions/public/getLogs
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/logs_event-logs
- JSON-RPC Methods: [`eth_getLogs`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getlogs)

**Example**

```ts
import { createPublicClient, http, parseAbiItem } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const logs = await client.getLogs()
```

#### getProof

(`args`) => `Promise`\<`GetProofReturnType`\>

Returns the account and storage values of the specified account including the Merkle-proof.

- Docs: https://viem.sh/docs/actions/public/getProof
- JSON-RPC Methods:
- Calls [`eth_getProof`](https://eips.ethereum.org/EIPS/eip-1186)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const block = await client.getProof({
address: '0x...',
storageKeys: ['0x...'],
})
```

#### getStorageAt

(`args`) => `Promise`\<`GetStorageAtReturnType`\>

Returns the value from a storage slot at a given address.

- Docs: https://viem.sh/docs/contract/getStorageAt
- JSON-RPC Methods: [`eth_getStorageAt`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getstorageat)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { getStorageAt } from 'viem/contract'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const code = await client.getStorageAt({
address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
slot: toHex(0),
})
```

#### getTransaction

\<`blockTag`\>(`args`) => `Promise`\<
\| \{
`accessList?`: `undefined`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `` `0x${string}` ``;
`blockNumber`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `bigint`;
`chainId?`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice`: `bigint`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas?`: `undefined`;
`maxPriorityFeePerGas?`: `undefined`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${string}` ``;
`transactionIndex`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `number`;
`type`: `"legacy"`;
`typeHex`: `null` \| `` `0x${string}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity?`: `undefined`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `` `0x${string}` ``;
`blockNumber`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice`: `bigint`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas?`: `undefined`;
`maxPriorityFeePerGas?`: `undefined`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${string}` ``;
`transactionIndex`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `number`;
`type`: `"eip2930"`;
`typeHex`: `null` \| `` `0x${string}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `` `0x${string}` ``;
`blockNumber`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${string}` ``;
`transactionIndex`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `number`;
`type`: `"eip1559"`;
`typeHex`: `null` \| `` `0x${string}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList?`: `undefined`;
`blobVersionedHashes`: readonly `` `0x${string}` ``[];
`blockHash`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `` `0x${string}` ``;
`blockNumber`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas`: `bigint`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${string}` ``;
`transactionIndex`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `number`;
`type`: `"eip4844"`;
`typeHex`: `null` \| `` `0x${string}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}
\| \{
`accessList`: `AccessList`;
`authorizationList`: `SignedAuthorizationList`;
`blobVersionedHashes?`: `undefined`;
`blockHash`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `` `0x${string}` ``;
`blockNumber`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `bigint`;
`chainId`: `number`;
`from`: `` `0x${string}` ``;
`gas`: `bigint`;
`gasPrice?`: `undefined`;
`hash`: `` `0x${string}` ``;
`input`: `` `0x${string}` ``;
`maxFeePerBlobGas?`: `undefined`;
`maxFeePerGas`: `bigint`;
`maxPriorityFeePerGas`: `bigint`;
`nonce`: `number`;
`r`: `` `0x${string}` ``;
`s`: `` `0x${string}` ``;
`to`: `null` \| `` `0x${string}` ``;
`transactionIndex`: `blockTag` *extends* `"pending"` ? `true` : `false` *extends* `true` ? `null` : `number`;
`type`: `"eip7702"`;
`typeHex`: `null` \| `` `0x${string}` ``;
`v`: `bigint`;
`value`: `bigint`;
`yParity`: `number`;
\}\>

Returns information about a [Transaction](https://viem.sh/docs/glossary/terms#transaction) given a hash or block identifier.

- Docs: https://viem.sh/docs/actions/public/getTransaction
- Example: https://stackblitz.com/github/wevm/viem/tree/main/examples/transactions_fetching-transactions
- JSON-RPC Methods: [`eth_getTransactionByHash`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getTransactionByHash)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const transaction = await client.getTransaction({
hash: '0x4ca7ee652d57678f26e887c149ab0735f41de37bcad58c9f6d3ed5824f15b74d',
})
```

#### getTransactionConfirmations

(`args`) => `Promise`\<`bigint`\>

Returns the number of blocks passed (confirmations) since the transaction was processed on a block.

- Docs: https://viem.sh/docs/actions/public/getTransactionConfirmations
- Example: https://stackblitz.com/github/wevm/viem/tree/main/examples/transactions_fetching-transactions
- JSON-RPC Methods: [`eth_getTransactionConfirmations`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getTransactionConfirmations)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const confirmations = await client.getTransactionConfirmations({
hash: '0x4ca7ee652d57678f26e887c149ab0735f41de37bcad58c9f6d3ed5824f15b74d',
})
```

#### getTransactionCount

(`args`) => `Promise`\<`number`\>

Returns the number of [Transactions](https://viem.sh/docs/glossary/terms#transaction) an Account has broadcast / sent.

- Docs: https://viem.sh/docs/actions/public/getTransactionCount
- JSON-RPC Methods: [`eth_getTransactionCount`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_gettransactioncount)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const transactionCount = await client.getTransactionCount({
address: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
})
```

#### getTransactionReceipt

(`args`) => `Promise`\<`TransactionReceipt`\>

Returns the [Transaction Receipt](https://viem.sh/docs/glossary/terms#transaction-receipt) given a [Transaction](https://viem.sh/docs/glossary/terms#transaction) hash.

- Docs: https://viem.sh/docs/actions/public/getTransactionReceipt
- Example: https://stackblitz.com/github/wevm/viem/tree/main/examples/transactions_fetching-transactions
- JSON-RPC Methods: [`eth_getTransactionReceipt`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getTransactionReceipt)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const transactionReceipt = await client.getTransactionReceipt({
hash: '0x4ca7ee652d57678f26e887c149ab0735f41de37bcad58c9f6d3ed5824f15b74d',
})
```

#### key

`string`

A key for the client.

#### multicall

\<`contracts`, `allowFailure`\>(`args`) => `Promise`\<`MulticallReturnType`\<`contracts`, `allowFailure`\>\>

Similar to [`readContract`](https://viem.sh/docs/contract/readContract), but batches up multiple functions on a contract in a single RPC call via the [`multicall3` contract](https://github.com/mds1/multicall).

- Docs: https://viem.sh/docs/contract/multicall

**Example**

```ts
import { createPublicClient, http, parseAbi } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const abi = parseAbi([
'function balanceOf(address) view returns (uint256)',
'function totalSupply() view returns (uint256)',
])
const result = await client.multicall({
contracts: [
{
address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
abi,
functionName: 'balanceOf',
args: ['0xA0Cf798816D4b9b9866b5330EEa46a18382f251e'],
},
{
address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
abi,
functionName: 'totalSupply',
},
],
})
// [{ result: 424122n, status: 'success' }, { result: 1000000n, status: 'success' }]
```

#### name

`string`

A name for the client.

#### pollingInterval

`number`

Frequency (in ms) for polling enabled actions & events. Defaults to 4_000 milliseconds.

#### prepareTransactionRequest

\<`request`, `chainOverride`, `accountOverride`\>(`args`) => `Promise`\<\{ \[K in string \| number \| symbol\]: (UnionRequiredBy\<Extract\<(...) & (...) & (...), (...) extends (...) ? (...) : (...)\> & \{ chainId?: (...) \| (...) \}, ParameterTypeToParameters\<(...)\[(...)\] extends readonly (...)\[\] ? (...)\[(...)\] : (...) \| (...) \| (...) \| (...) \| (...) \| (...)\>\> & (unknown extends request\["kzg"\] ? \{\} : Pick\<request, "kzg"\>))\[K\] \}\>

Prepares a transaction request for signing.

- Docs: https://viem.sh/docs/actions/wallet/prepareTransactionRequest

**Examples**

```ts
import { createWalletClient, custom } from 'viem'
import { mainnet } from 'viem/chains'

const client = createWalletClient({
chain: mainnet,
transport: custom(window.ethereum),
})
const request = await client.prepareTransactionRequest({
account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
to: '0x0000000000000000000000000000000000000000',
value: 1n,
})
```

```ts
// Account Hoisting
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

const client = createWalletClient({
account: privateKeyToAccount('0x…'),
chain: mainnet,
transport: custom(window.ethereum),
})
const request = await client.prepareTransactionRequest({
to: '0x0000000000000000000000000000000000000000',
value: 1n,
})
```

#### readContract

\<`abi`, `functionName`, `args`\>(`args`) => `Promise`\<`ReadContractReturnType`\<`abi`, `functionName`, `args`\>\>

Calls a read-only function on a contract, and returns the response.

- Docs: https://viem.sh/docs/contract/readContract
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/contracts_reading-contracts

**Remarks**

A "read-only" function (constant function) on a Solidity contract is denoted by a `view` or `pure` keyword. They can only read the state of the contract, and cannot make any changes to it. Since read-only methods do not change the state of the contract, they do not require any gas to be executed, and can be called by any user without the need to pay for gas.

Internally, uses a [Public Client](https://viem.sh/docs/clients/public) to call the [`call` action](https://viem.sh/docs/actions/public/call) with [ABI-encoded `data`](https://viem.sh/docs/contract/encodeFunctionData).

**Example**

```ts
import { createPublicClient, http, parseAbi } from 'viem'
import { mainnet } from 'viem/chains'
import { readContract } from 'viem/contract'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const result = await client.readContract({
address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
functionName: 'balanceOf',
args: ['0xA0Cf798816D4b9b9866b5330EEa46a18382f251e'],
})
// 424122n
```

#### request

`EIP1193RequestFn`\<`PublicRpcSchema`\>

Request function wrapped with friendly error handling

#### sendRawTransaction

(`args`) => `Promise`\<`` `0x${string}` ``\>

Sends a **signed** transaction to the network

- Docs: https://viem.sh/docs/actions/wallet/sendRawTransaction
- JSON-RPC Method: [`eth_sendRawTransaction`](https://ethereum.github.io/execution-apis/api-documentation/)

**Example**

```ts
import { createWalletClient, custom } from 'viem'
import { mainnet } from 'viem/chains'
import { sendRawTransaction } from 'viem/wallet'

const client = createWalletClient({
chain: mainnet,
transport: custom(window.ethereum),
})

const hash = await client.sendRawTransaction({
serializedTransaction: '0x02f850018203118080825208808080c080a04012522854168b27e5dc3d5839bab5e6b39e1a0ffd343901ce1622e3d64b48f1a04e00902ae0502c4728cbf12156290df99c3ed7de85b1dbfe20b5c36931733a33'
})
```

#### simulate

\<`calls`\>(`args`) => `Promise`\<`SimulateBlocksReturnType`\<`calls`\>\>

**Deprecated**

Use `simulateBlocks` instead.

#### simulateBlocks

\<`calls`\>(`args`) => `Promise`\<`SimulateBlocksReturnType`\<`calls`\>\>

Simulates a set of calls on block(s) with optional block and state overrides.

**Example**

```ts
import { createPublicClient, http, parseEther } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})

const result = await client.simulateBlocks({
blocks: [{
blockOverrides: {
number: 69420n,
},
calls: [{
{
account: '0x5a0b54d5dc17e482fe8b0bdca5320161b95fb929',
data: '0xdeadbeef',
to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
},
{
account: '0x5a0b54d5dc17e482fe8b0bdca5320161b95fb929',
to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
value: parseEther('1'),
},
}],
stateOverrides: [{
address: '0x5a0b54d5dc17e482fe8b0bdca5320161b95fb929',
balance: parseEther('10'),
}],
}]
})
```

#### simulateCalls

\<`calls`\>(`args`) => `Promise`\<`SimulateCallsReturnType`\<`calls`\>\>

Simulates a set of calls.

**Example**

```ts
import { createPublicClient, http, parseEther } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})

const result = await client.simulateCalls({
account: '0x5a0b54d5dc17e482fe8b0bdca5320161b95fb929',
calls: [{
{
data: '0xdeadbeef',
to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
},
{
to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
value: parseEther('1'),
},
]
})
```

#### simulateContract

\<`abi`, `functionName`, `args`, `chainOverride`, `accountOverride`\>(`args`) => `Promise`\<`SimulateContractReturnType`\<`abi`, `functionName`, `args`, `undefined` \| `Chain`, `undefined` \| `Account`, `chainOverride`, `accountOverride`\>\>

Simulates/validates a contract interaction. This is useful for retrieving **return data** and **revert reasons** of contract write functions.

- Docs: https://viem.sh/docs/contract/simulateContract
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/contracts_writing-to-contracts

**Remarks**

This function does not require gas to execute and _**does not**_ change the state of the blockchain. It is almost identical to [`readContract`](https://viem.sh/docs/contract/readContract), but also supports contract write functions.

Internally, uses a [Public Client](https://viem.sh/docs/clients/public) to call the [`call` action](https://viem.sh/docs/actions/public/call) with [ABI-encoded `data`](https://viem.sh/docs/contract/encodeFunctionData).

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const result = await client.simulateContract({
address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
abi: parseAbi(['function mint(uint32) view returns (uint32)']),
functionName: 'mint',
args: ['69420'],
account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
})
```

#### transport

`TransportConfig`\<`string`, `EIP1193RequestFn`\> & `Record`\<`string`, `any`\>

The RPC transport

#### type

`string`

The type of client.

#### uid

`string`

A unique ID for the client.

#### uninstallFilter

(`args`) => `Promise`\<`boolean`\>

Destroys a Filter that was created from one of the following Actions:

- [`createBlockFilter`](https://viem.sh/docs/actions/public/createBlockFilter)
- [`createEventFilter`](https://viem.sh/docs/actions/public/createEventFilter)
- [`createPendingTransactionFilter`](https://viem.sh/docs/actions/public/createPendingTransactionFilter)

- Docs: https://viem.sh/docs/actions/public/uninstallFilter
- JSON-RPC Methods: [`eth_uninstallFilter`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_uninstallFilter)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { createPendingTransactionFilter, uninstallFilter } from 'viem/public'

const filter = await client.createPendingTransactionFilter()
const uninstalled = await client.uninstallFilter({ filter })
// true
```

#### verifyMessage

(`args`) => `Promise`\<`boolean`\>

Verify that a message was signed by the provided address.

Compatible with Smart Contract Accounts & Externally Owned Accounts via [ERC-6492](https://eips.ethereum.org/EIPS/eip-6492).

- Docs [https://viem.sh/docs/actions/public/verifyMessage](https://viem.sh/docs/actions/public/verifyMessage)

#### verifySiweMessage

(`args`) => `Promise`\<`boolean`\>

Verifies [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) formatted message was signed.

Compatible with Smart Contract Accounts & Externally Owned Accounts via [ERC-6492](https://eips.ethereum.org/EIPS/eip-6492).

- Docs [https://viem.sh/docs/siwe/actions/verifySiweMessage](https://viem.sh/docs/siwe/actions/verifySiweMessage)

#### verifyTypedData

(`args`) => `Promise`\<`boolean`\>

Verify that typed data was signed by the provided address.

- Docs [https://viem.sh/docs/actions/public/verifyTypedData](https://viem.sh/docs/actions/public/verifyTypedData)

#### waitForTransactionReceipt

(`args`) => `Promise`\<`TransactionReceipt`\>

Waits for the [Transaction](https://viem.sh/docs/glossary/terms#transaction) to be included on a [Block](https://viem.sh/docs/glossary/terms#block) (one confirmation), and then returns the [Transaction Receipt](https://viem.sh/docs/glossary/terms#transaction-receipt). If the Transaction reverts, then the action will throw an error.

- Docs: https://viem.sh/docs/actions/public/waitForTransactionReceipt
- Example: https://stackblitz.com/github/wevm/viem/tree/main/examples/transactions_sending-transactions
- JSON-RPC Methods:
- Polls [`eth_getTransactionReceipt`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getTransactionReceipt) on each block until it has been processed.
- If a Transaction has been replaced:
- Calls [`eth_getBlockByNumber`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getblockbynumber) and extracts the transactions
- Checks if one of the Transactions is a replacement
- If so, calls [`eth_getTransactionReceipt`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getTransactionReceipt).

**Remarks**

The `waitForTransactionReceipt` action additionally supports Replacement detection (e.g. sped up Transactions).

Transactions can be replaced when a user modifies their transaction in their wallet (to speed up or cancel). Transactions are replaced when they are sent from the same nonce.

There are 3 types of Transaction Replacement reasons:

- `repriced`: The gas price has been modified (e.g. different `maxFeePerGas`)
- `cancelled`: The Transaction has been cancelled (e.g. `value === 0n`)
- `replaced`: The Transaction has been replaced (e.g. different `value` or `data`)

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const transactionReceipt = await client.waitForTransactionReceipt({
hash: '0x4ca7ee652d57678f26e887c149ab0735f41de37bcad58c9f6d3ed5824f15b74d',
})
```

#### watchBlockNumber

(`args`) => `WatchBlockNumberReturnType`

Watches and returns incoming block numbers.

- Docs: https://viem.sh/docs/actions/public/watchBlockNumber
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/blocks_watching-blocks
- JSON-RPC Methods:
- When `poll: true`, calls [`eth_blockNumber`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_blocknumber) on a polling interval.
- When `poll: false` & WebSocket Transport, uses a WebSocket subscription via [`eth_subscribe`](https://docs.alchemy.com/reference/eth-subscribe-polygon) and the `"newHeads"` event.

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const unwatch = await client.watchBlockNumber({
onBlockNumber: (blockNumber) => console.log(blockNumber),
})
```

#### watchBlocks

\<`includeTransactions`, `blockTag`\>(`args`) => `WatchBlocksReturnType`

Watches and returns information for incoming blocks.

- Docs: https://viem.sh/docs/actions/public/watchBlocks
- Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/blocks_watching-blocks
- JSON-RPC Methods:
- When `poll: true`, calls [`eth_getBlockByNumber`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getBlockByNumber) on a polling interval.
- When `poll: false` & WebSocket Transport, uses a WebSocket subscription via [`eth_subscribe`](https://docs.alchemy.com/reference/eth-subscribe-polygon) and the `"newHeads"` event.

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const unwatch = await client.watchBlocks({
onBlock: (block) => console.log(block),
})
```

#### watchContractEvent

\<`abi`, `eventName`, `strict`\>(`args`) => `WatchContractEventReturnType`

Watches and returns emitted contract event logs.

- Docs: https://viem.sh/docs/contract/watchContractEvent

**Remarks**

This Action will batch up all the event logs found within the [`pollingInterval`](https://viem.sh/docs/contract/watchContractEvent#pollinginterval-optional), and invoke them via [`onLogs`](https://viem.sh/docs/contract/watchContractEvent#onLogs).

`watchContractEvent` will attempt to create an [Event Filter](https://viem.sh/docs/contract/createContractEventFilter) and listen to changes to the Filter per polling interval, however, if the RPC Provider does not support Filters (e.g. `eth_newFilter`), then `watchContractEvent` will fall back to using [`getLogs`](https://viem.sh/docs/actions/public/getLogs) instead.

**Example**

```ts
import { createPublicClient, http, parseAbi } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const unwatch = client.watchContractEvent({
address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
abi: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']),
eventName: 'Transfer',
args: { from: '0xc961145a54C96E3aE9bAA048c4F4D6b04C13916b' },
onLogs: (logs) => console.log(logs),
})
```

#### watchEvent

\<`abiEvent`, `abiEvents`, `strict`\>(`args`) => `WatchEventReturnType`

Watches and returns emitted [Event Logs](https://viem.sh/docs/glossary/terms#event-log).

- Docs: https://viem.sh/docs/actions/public/watchEvent
- JSON-RPC Methods:
- **RPC Provider supports `eth_newFilter`:**
- Calls [`eth_newFilter`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_newfilter) to create a filter (called on initialize).
- On a polling interval, it will call [`eth_getFilterChanges`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getfilterchanges).
- **RPC Provider does not support `eth_newFilter`:**
- Calls [`eth_getLogs`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getlogs) for each block between the polling interval.

**Remarks**

This Action will batch up all the Event Logs found within the [`pollingInterval`](https://viem.sh/docs/actions/public/watchEvent#pollinginterval-optional), and invoke them via [`onLogs`](https://viem.sh/docs/actions/public/watchEvent#onLogs).

`watchEvent` will attempt to create an [Event Filter](https://viem.sh/docs/actions/public/createEventFilter) and listen to changes to the Filter per polling interval, however, if the RPC Provider does not support Filters (e.g. `eth_newFilter`), then `watchEvent` will fall back to using [`getLogs`](https://viem.sh/docs/actions/public/getLogs) instead.

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const unwatch = client.watchEvent({
onLogs: (logs) => console.log(logs),
})
```

#### watchPendingTransactions

(`args`) => `WatchPendingTransactionsReturnType`

Watches and returns pending transaction hashes.

- Docs: https://viem.sh/docs/actions/public/watchPendingTransactions
- JSON-RPC Methods:
- When `poll: true`
- Calls [`eth_newPendingTransactionFilter`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_newpendingtransactionfilter) to initialize the filter.
- Calls [`eth_getFilterChanges`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getFilterChanges) on a polling interval.
- When `poll: false` & WebSocket Transport, uses a WebSocket subscription via [`eth_subscribe`](https://docs.alchemy.com/reference/eth-subscribe-polygon) and the `"newPendingTransactions"` event.

**Remarks**

This Action will batch up all the pending transactions found within the [`pollingInterval`](https://viem.sh/docs/actions/public/watchPendingTransactions#pollinginterval-optional), and invoke them via [`onTransactions`](https://viem.sh/docs/actions/public/watchPendingTransactions#ontransactions).

**Example**

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
chain: mainnet,
transport: http(),
})
const unwatch = await client.watchPendingTransactions({
onTransactions: (hashes) => console.log(hashes),
})
```

## Returns

provider is \{ account: undefined; batch?: \{ multicall?: boolean \| \{ batchSize?: number; wait?: number \} \}; cacheTime: number; call: (parameters: CallParameters\<undefined \| Chain\>) =\> Promise\<CallReturnType\>; ccipRead?: false \| \{ request?: (parameters: CcipRequestParameters) =\> Promise\<\`0x$\{string\}\`\> \}; chain: undefined \| Chain; createAccessList: (parameters: CreateAccessListParameters\<undefined \| Chain\>) =\> Promise\<\{ accessList: AccessList; gasUsed: bigint \}\>; createBlockFilter: () =\> Promise\<\{ id: \`0x$\{string\}\`; request: EIP1193RequestFn\<readonly \[\{ Method: "eth\_getFilterChanges"; Parameters: \[filterId: \`0x$\{string\}\`\]; ReturnType: \`0x$\{string\}\`\[\] \| RpcLog\[\] \}, \{ Method: "eth\_getFilterLogs"; Parameters: \[filterId: \`0x$\{string\}\`\]; ReturnType: RpcLog\[\] \}, \{ Method: "eth\_uninstallFilter"; Parameters: \[filterId: \`0x$\{string\}\`\]; ReturnType: boolean \}\]\>; type: "block" \}\>; createContractEventFilter: (args: CreateContractEventFilterParameters\<abi, eventName, args, strict, fromBlock, toBlock\>) =\> Promise\<CreateContractEventFilterReturnType\<abi, eventName, args, strict, fromBlock, toBlock\>\>; createEventFilter: (args?: CreateEventFilterParameters\<abiEvent, abiEvents, strict, fromBlock, toBlock, \_EventName, \_Args\>) =\> Promise\<\{ \[K in string \| number \| symbol\]: Filter\<"event", abiEvents, \_EventName, \_Args, strict, fromBlock, toBlock\>\[K\] \}\>; createPendingTransactionFilter: () =\> Promise\<\{ id: \`0x$\{string\}\`; request: EIP1193RequestFn\<readonly \[\{ Method: "eth\_getFilterChanges"; Parameters: \[filterId: \`0x$\{string\}\`\]; ReturnType: \`0x$\{string\}\`\[\] \| RpcLog\[\] \}, \{ Method: "eth\_getFilterLogs"; Parameters: \[filterId: \`0x$\{string\}\`\]; ReturnType: RpcLog\[\] \}, \{ Method: "eth\_uninstallFilter"; Parameters: \[filterId: \`0x$\{string\}\`\]; ReturnType: boolean \}\]\>; type: "transaction" \}\>; estimateContractGas: (args: EstimateContractGasParameters\<abi, functionName, args, chain\>) =\> Promise\<bigint\>; estimateFeesPerGas: (args?: EstimateFeesPerGasParameters\<undefined \| Chain, chainOverride, type\>) =\> Promise\<EstimateFeesPerGasReturnType\<type\>\>; estimateGas: (args: EstimateGasParameters\<undefined \| Chain\>) =\> Promise\<bigint\>; estimateMaxPriorityFeePerGas: (args?: \{ chain: null \| chainOverride \}) =\> Promise\<bigint\>; extend: (fn: (client: Client\<Transport, undefined \| Chain, undefined, PublicRpcSchema, PublicActions\<Transport, undefined \| Chain\>\>) =\> client) =\> Client\<Transport, undefined \| Chain, undefined, PublicRpcSchema, \{ \[K in string \| number \| symbol\]: client\[K\] \} & PublicActions\<Transport, undefined \| Chain\>\>; getBalance: (args: GetBalanceParameters) =\> Promise\<bigint\>; getBlobBaseFee: () =\> Promise\<bigint\>; getBlock: (args?: GetBlockParameters\<includeTransactions, blockTag\>) =\> Promise\<\{ baseFeePerGas: null \| bigint; blobGasUsed: bigint; difficulty: bigint; excessBlobGas: bigint; extraData: \`0x$\{string\}\`; gasLimit: bigint; gasUsed: bigint; hash: blockTag extends "pending" ? null : \`0x$\{string\}\`; logsBloom: blockTag extends "pending" ? null : \`0x$\{string\}\`; miner: \`0x$\{string\}\`; mixHash: \`0x$\{string\}\`; nonce: blockTag extends "pending" ? null : \`0x$\{string\}\`; number: blockTag extends "pending" ? null : bigint; parentBeaconBlockRoot?: \`0x$\{string\}\`; parentHash: \`0x$\{string\}\`; receiptsRoot: \`0x$\{string\}\`; sealFields: \`0x$\{string\}\`\[\]; sha3Uncles: \`0x$\{string\}\`; size: bigint; stateRoot: \`0x$\{string\}\`; timestamp: bigint; totalDifficulty: null \| bigint; transactions: includeTransactions extends true ? (\{ accessList?: undefined; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : \`0x$\{string\}\`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId?: number; from: \`0x$\{string\}\`; gas: bigint; gasPrice: bigint; hash: \`0x$\{string\}\`; input: \`0x$\{string\}\`; maxFeePerBlobGas?: undefined; maxFeePerGas?: undefined; maxPriorityFeePerGas?: undefined; nonce: number; r: \`0x$\{string\}\`; s: \`0x$\{string\}\`; to: null \| \`0x$\{string\}\`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "legacy"; typeHex: null \| \`0x$\{string\}\`; v: bigint; value: bigint; yParity?: undefined \} \| \{ accessList: AccessList; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : \`0x$\{string\}\`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: \`0x$\{string\}\`; gas: bigint; gasPrice: bigint; hash: \`0x$\{string\}\`; input: \`0x$\{string\}\`; maxFeePerBlobGas?: undefined; maxFeePerGas?: undefined; maxPriorityFeePerGas?: undefined; nonce: number; r: \`0x$\{string\}\`; s: \`0x$\{string\}\`; to: null \| \`0x$\{string\}\`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip2930"; typeHex: null \| \`0x$\{string\}\`; v: bigint; value: bigint; yParity: number \} \| \{ accessList: AccessList; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : \`0x$\{string\}\`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: \`0x$\{string\}\`; gas: bigint; gasPrice?: undefined; hash: \`0x$\{string\}\`; input: \`0x$\{string\}\`; maxFeePerBlobGas?: undefined; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: \`0x$\{string\}\`; s: \`0x$\{string\}\`; to: null \| \`0x$\{string\}\`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip1559"; typeHex: null \| \`0x$\{string\}\`; v: bigint; value: bigint; yParity: number \} \| \{ accessList: AccessList; authorizationList?: undefined; blobVersionedHashes: readonly \`0x$\{string\}\`\[\]; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : \`0x$\{string\}\`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: \`0x$\{string\}\`; gas: bigint; gasPrice?: undefined; hash: \`0x$\{string\}\`; input: \`0x$\{string\}\`; maxFeePerBlobGas: bigint; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: \`0x$\{string\}\`; s: \`0x$\{string\}\`; to: null \| \`0x$\{string\}\`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip4844"; typeHex: null \| \`0x$\{string\}\`; v: bigint; value: bigint; yParity: number \} \| \{ accessList: AccessList; authorizationList: SignedAuthorizationList; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : \`0x$\{string\}\`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: \`0x$\{string\}\`; gas: bigint; gasPrice?: undefined; hash: \`0x$\{string\}\`; input: \`0x$\{string\}\`; maxFeePerBlobGas?: undefined; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: \`0x$\{string\}\`; s: \`0x$\{string\}\`; to: null \| \`0x$\{string\}\`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip7702"; typeHex: null \| \`0x$\{string\}\`; v: bigint; value: bigint; yParity: number \})\[\] : \`0x$\{string\}\`\[\]; transactionsRoot: \`0x$\{string\}\`; uncles: \`0x$\{string\}\`\[\]; withdrawals?: Withdrawal\[\]; withdrawalsRoot?: \`0x$\{string\}\` \}\>; getBlockNumber: (args?: GetBlockNumberParameters) =\> Promise\<bigint\>; getBlockTransactionCount: (args?: GetBlockTransactionCountParameters) =\> Promise\<number\>; getBytecode: (args: GetCodeParameters) =\> Promise\<GetCodeReturnType\>; getChainId: () =\> Promise\<number\>; getCode: (args: GetCodeParameters) =\> Promise\<GetCodeReturnType\>; getContractEvents: (args: GetContractEventsParameters\<abi, eventName, strict, fromBlock, toBlock\>) =\> Promise\<GetContractEventsReturnType\<abi, eventName, strict, fromBlock, toBlock\>\>; getEip712Domain: (args: GetEip712DomainParameters) =\> Promise\<GetEip712DomainReturnType\>; getEnsAddress: (args: \{ blockNumber?: bigint; blockTag?: BlockTag; coinType?: number; gatewayUrls?: string\[\]; name: string; strict?: boolean; universalResolverAddress?: \`0x$\{string\}\` \}) =\> Promise\<GetEnsAddressReturnType\>; getEnsAvatar: (args: \{ assetGatewayUrls?: AssetGatewayUrls; blockNumber?: bigint; blockTag?: BlockTag; gatewayUrls?: string\[\]; name: string; strict?: boolean; universalResolverAddress?: \`0x$\{string\}\` \}) =\> Promise\<GetEnsAvatarReturnType\>; getEnsName: (args: \{ address: \`0x$\{string\}\`; blockNumber?: bigint; blockTag?: BlockTag; gatewayUrls?: string\[\]; strict?: boolean; universalResolverAddress?: \`0x$\{string\}\` \}) =\> Promise\<GetEnsNameReturnType\>; getEnsResolver: (args: \{ blockNumber?: bigint; blockTag?: BlockTag; name: string; universalResolverAddress?: \`0x$\{string\}\` \}) =\> Promise\<\`0x$\{string\}\`\>; getEnsText: (args: \{ blockNumber?: bigint; blockTag?: BlockTag; gatewayUrls?: string\[\]; key: string; name: string; strict?: boolean; universalResolverAddress?: \`0x$\{string\}\` \}) =\> Promise\<GetEnsTextReturnType\>; getFeeHistory: (args: GetFeeHistoryParameters) =\> Promise\<GetFeeHistoryReturnType\>; getFilterChanges: (args: GetFilterChangesParameters\<filterType, abi, eventName, strict, fromBlock, toBlock\>) =\> Promise\<GetFilterChangesReturnType\<filterType, abi, eventName, strict, fromBlock, toBlock\>\>; getFilterLogs: (args: GetFilterLogsParameters\<abi, eventName, strict, fromBlock, toBlock\>) =\> Promise\<GetFilterLogsReturnType\<abi, eventName, strict, fromBlock, toBlock\>\>; getGasPrice: () =\> Promise\<bigint\>; getLogs: (args?: GetLogsParameters\<abiEvent, abiEvents, strict, fromBlock, toBlock\>) =\> Promise\<GetLogsReturnType\<abiEvent, abiEvents, strict, fromBlock, toBlock\>\>; getProof: (args: GetProofParameters) =\> Promise\<GetProofReturnType\>; getStorageAt: (args: GetStorageAtParameters) =\> Promise\<GetStorageAtReturnType\>; getTransaction: (args: GetTransactionParameters\<blockTag\>) =\> Promise\<\{ accessList?: undefined; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : \`0x$\{string\}\`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId?: number; from: \`0x$\{string\}\`; gas: bigint; gasPrice: bigint; hash: \`0x$\{string\}\`; input: \`0x$\{string\}\`; maxFeePerBlobGas?: undefined; maxFeePerGas?: undefined; maxPriorityFeePerGas?: undefined; nonce: number; r: \`0x$\{string\}\`; s: \`0x$\{string\}\`; to: null \| \`0x$\{string\}\`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "legacy"; typeHex: null \| \`0x$\{string\}\`; v: bigint; value: bigint; yParity?: undefined \} \| \{ accessList: AccessList; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : \`0x$\{string\}\`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: \`0x$\{string\}\`; gas: bigint; gasPrice: bigint; hash: \`0x$\{string\}\`; input: \`0x$\{string\}\`; maxFeePerBlobGas?: undefined; maxFeePerGas?: undefined; maxPriorityFeePerGas?: undefined; nonce: number; r: \`0x$\{string\}\`; s: \`0x$\{string\}\`; to: null \| \`0x$\{string\}\`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip2930"; typeHex: null \| \`0x$\{string\}\`; v: bigint; value: bigint; yParity: number \} \| \{ accessList: AccessList; authorizationList?: undefined; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : \`0x$\{string\}\`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: \`0x$\{string\}\`; gas: bigint; gasPrice?: undefined; hash: \`0x$\{string\}\`; input: \`0x$\{string\}\`; maxFeePerBlobGas?: undefined; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: \`0x$\{string\}\`; s: \`0x$\{string\}\`; to: null \| \`0x$\{string\}\`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip1559"; typeHex: null \| \`0x$\{string\}\`; v: bigint; value: bigint; yParity: number \} \| \{ accessList: AccessList; authorizationList?: undefined; blobVersionedHashes: readonly \`0x$\{string\}\`\[\]; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : \`0x$\{string\}\`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: \`0x$\{string\}\`; gas: bigint; gasPrice?: undefined; hash: \`0x$\{string\}\`; input: \`0x$\{string\}\`; maxFeePerBlobGas: bigint; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: \`0x$\{string\}\`; s: \`0x$\{string\}\`; to: null \| \`0x$\{string\}\`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip4844"; typeHex: null \| \`0x$\{string\}\`; v: bigint; value: bigint; yParity: number \} \| \{ accessList: AccessList; authorizationList: SignedAuthorizationList; blobVersionedHashes?: undefined; blockHash: (blockTag extends "pending" ? true : false) extends true ? null : \`0x$\{string\}\`; blockNumber: (blockTag extends "pending" ? true : false) extends true ? null : bigint; chainId: number; from: \`0x$\{string\}\`; gas: bigint; gasPrice?: undefined; hash: \`0x$\{string\}\`; input: \`0x$\{string\}\`; maxFeePerBlobGas?: undefined; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; nonce: number; r: \`0x$\{string\}\`; s: \`0x$\{string\}\`; to: null \| \`0x$\{string\}\`; transactionIndex: (blockTag extends "pending" ? true : false) extends true ? null : number; type: "eip7702"; typeHex: null \| \`0x$\{string\}\`; v: bigint; value: bigint; yParity: number \}\>; getTransactionConfirmations: (args: GetTransactionConfirmationsParameters\<undefined \| Chain\>) =\> Promise\<bigint\>; getTransactionCount: (args: GetTransactionCountParameters) =\> Promise\<number\>; getTransactionReceipt: (args: GetTransactionReceiptParameters) =\> Promise\<TransactionReceipt\>; key: string; multicall: (args: MulticallParameters\<contracts, allowFailure\>) =\> Promise\<MulticallReturnType\<contracts, allowFailure\>\>; name: string; pollingInterval: number; prepareTransactionRequest: (args: PrepareTransactionRequestParameters\<undefined \| Chain, undefined \| Account, chainOverride, accountOverride, request\>) =\> Promise\<\{ \[K in string \| number \| symbol\]: (UnionRequiredBy\<Extract\<UnionOmit\<(...), (...)\> & ((...) extends (...) ? (...) : (...)) & ((...) extends (...) ? (...) : (...)), IsNever\<(...)\> extends true ? unknown : ExactPartial\<(...)\>\> & \{ chainId?: number \}, ParameterTypeToParameters\<request\["parameters"\] extends readonly PrepareTransactionRequestParameterType\[\] ? any\[any\]\[number\] : "chainId" \| "type" \| "gas" \| "nonce" \| "blobVersionedHashes" \| "fees"\>\> & (unknown extends request\["kzg"\] ? \{\} : Pick\<request, "kzg"\>))\[K\] \}\>; readContract: (args: ReadContractParameters\<abi, functionName, args\>) =\> Promise\<ReadContractReturnType\<abi, functionName, args\>\>; request: EIP1193RequestFn\<PublicRpcSchema\>; sendRawTransaction: (args: SendRawTransactionParameters) =\> Promise\<\`0x$\{string\}\`\>; simulate: (args: SimulateBlocksParameters\<calls\>) =\> Promise\<SimulateBlocksReturnType\<calls\>\>; simulateBlocks: (args: SimulateBlocksParameters\<calls\>) =\> Promise\<SimulateBlocksReturnType\<calls\>\>; simulateCalls: (args: SimulateCallsParameters\<calls\>) =\> Promise\<SimulateCallsReturnType\<calls\>\>; simulateContract: (args: SimulateContractParameters\<abi, functionName, args, undefined \| Chain, chainOverride, accountOverride\>) =\> Promise\<SimulateContractReturnType\<abi, functionName, args, undefined \| Chain, undefined \| Account, chainOverride, accountOverride\>\>; transport: TransportConfig\<string, EIP1193RequestFn\> & Record\<string, any\>; type: string; uid: string; uninstallFilter: (args: UninstallFilterParameters) =\> Promise\<boolean\>; verifyMessage: (args: \{ address: \`0x$\{string\}\`; blockNumber?: bigint; blockTag?: BlockTag; factory?: \`0x$\{string\}\`; factoryData?: \`0x$\{string\}\`; message: SignableMessage; signature: \`0x$\{string\}\` \| ByteArray \| Signature; universalSignatureVerifierAddress?: \`0x$\{string\}\` \}) =\> Promise\<boolean\>; verifySiweMessage: (args: \{ address?: \`0x$\{string\}\`; blockNumber?: bigint; blockTag?: BlockTag; domain?: string; message: string; nonce?: string; scheme?: string; signature: \`0x$\{string\}\`; time?: Date \}) =\> Promise\<boolean\>; verifyTypedData: (args: VerifyTypedDataParameters) =\> Promise\<boolean\>; waitForTransactionReceipt: (args: WaitForTransactionReceiptParameters\<undefined \| Chain\>) =\> Promise\<TransactionReceipt\>; watchBlockNumber: (args: WatchBlockNumberParameters) =\> WatchBlockNumberReturnType; watchBlocks: (args: WatchBlocksParameters\<Transport, undefined \| Chain, includeTransactions, blockTag\>) =\> WatchBlocksReturnType; watchContractEvent: (args: WatchContractEventParameters\<abi, eventName, strict, Transport\>) =\> WatchContractEventReturnType; watchEvent: (args: WatchEventParameters\<abiEvent, abiEvents, strict, Transport\>) =\> WatchEventReturnType; watchPendingTransactions: (args: WatchPendingTransactionsParameters\<Transport\>) =\> WatchPendingTransactionsReturnType \}
