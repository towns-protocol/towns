# Interface: UserReceivedBlockchainTransactionEvent

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:282](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L282)

## Properties

### kind

```ts
kind: UserReceivedBlockchainTransaction;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:283](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L283)

***

### receivedTransaction

```ts
receivedTransaction: object;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:284](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L284)

#### fromUserAddress

```ts
fromUserAddress: Uint8Array;
```

##### Generated

from field: bytes from_user_address = 2;

#### transaction?

```ts
optional transaction: object;
```

##### Generated

from field: river.BlockchainTransaction transaction = 1;

##### transaction.content

```ts
transaction.content: 
  | {
  case: "tip";
  value: {
     event?: {
        amount: bigint;
        channelId: Uint8Array;
        currency: Uint8Array;
        messageId: Uint8Array;
        receiver: Uint8Array;
        sender: Uint8Array;
        tokenId: bigint;
     };
     toUserAddress: Uint8Array;
  };
}
  | {
  case: "tokenTransfer";
  value: {
     address: Uint8Array;
     amount: string;
     channelId: Uint8Array;
     isBuy: boolean;
     messageId: Uint8Array;
     sender: Uint8Array;
  };
}
  | {
  case: "spaceReview";
  value: {
     action: BlockchainTransaction_SpaceReview_Action;
     event?: {
        rating: number;
        user: Uint8Array;
     };
     spaceAddress: Uint8Array;
  };
}
  | {
  case: undefined;
  value?: undefined;
};
```

optional metadata to be verified by the node

###### Type declaration

```ts
{
  case: "tip";
  value: {
     event?: {
        amount: bigint;
        channelId: Uint8Array;
        currency: Uint8Array;
        messageId: Uint8Array;
        receiver: Uint8Array;
        sender: Uint8Array;
        tokenId: bigint;
     };
     toUserAddress: Uint8Array;
  };
}
```

```ts
{
  case: "tokenTransfer";
  value: {
     address: Uint8Array;
     amount: string;
     channelId: Uint8Array;
     isBuy: boolean;
     messageId: Uint8Array;
     sender: Uint8Array;
  };
}
```

```ts
{
  case: "spaceReview";
  value: {
     action: BlockchainTransaction_SpaceReview_Action;
     event?: {
        rating: number;
        user: Uint8Array;
     };
     spaceAddress: Uint8Array;
  };
}
```

```ts
{
  case: undefined;
  value?: undefined;
}
```

###### Generated

from oneof river.BlockchainTransaction.content

##### transaction.receipt?

```ts
optional transaction.receipt: object;
```

required fields

###### Generated

from field: river.BlockchainTransactionReceipt receipt = 1;

##### transaction.receipt.blockNumber

```ts
transaction.receipt.blockNumber: bigint;
```

###### Generated

from field: uint64 block_number = 3;

##### transaction.receipt.chainId

```ts
transaction.receipt.chainId: bigint;
```

###### Generated

from field: uint64 chain_id = 1;

##### transaction.receipt.from

```ts
transaction.receipt.from: Uint8Array;
```

###### Generated

from field: bytes from = 5;

##### transaction.receipt.logs

```ts
transaction.receipt.logs: object[];
```

###### Generated

from field: repeated river.BlockchainTransactionReceipt.Log logs = 6;

##### transaction.receipt.to

```ts
transaction.receipt.to: Uint8Array;
```

###### Generated

from field: bytes to = 4;

##### transaction.receipt.transactionHash

```ts
transaction.receipt.transactionHash: Uint8Array;
```

###### Generated

from field: bytes transaction_hash = 2;

##### transaction.solanaReceipt?

```ts
optional transaction.solanaReceipt: object;
```

###### Generated

from field: river.SolanaBlockchainTransactionReceipt solana_receipt = 2;

##### transaction.solanaReceipt.meta?

```ts
optional transaction.solanaReceipt.meta: object;
```

###### Generated

from field: river.SolanaBlockchainTransactionReceipt.Meta meta = 3;

##### transaction.solanaReceipt.meta.postTokenBalances

```ts
transaction.solanaReceipt.meta.postTokenBalances: object[];
```

###### Generated

from field: repeated river.SolanaBlockchainTransactionReceipt.Meta.TokenBalance post_token_balances = 2;

##### transaction.solanaReceipt.meta.preTokenBalances

```ts
transaction.solanaReceipt.meta.preTokenBalances: object[];
```

###### Generated

from field: repeated river.SolanaBlockchainTransactionReceipt.Meta.TokenBalance pre_token_balances = 1;

##### transaction.solanaReceipt.slot

```ts
transaction.solanaReceipt.slot: bigint;
```

###### Generated

from field: uint64 slot = 1;

##### transaction.solanaReceipt.transaction?

```ts
optional transaction.solanaReceipt.transaction: object;
```

###### Generated

from field: river.SolanaBlockchainTransactionReceipt.Transaction transaction = 2;

##### transaction.solanaReceipt.transaction.signatures

```ts
transaction.solanaReceipt.transaction.signatures: string[];
```

###### Generated

from field: repeated string signatures = 1;
