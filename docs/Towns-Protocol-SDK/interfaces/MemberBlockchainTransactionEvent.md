# Interface: MemberBlockchainTransactionEvent

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:287](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L287)

## Properties

### fromUserId

```ts
fromUserId: string;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:290](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L290)

***

### kind

```ts
kind: MemberBlockchainTransaction;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:288](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L288)

***

### transaction?

```ts
optional transaction: object;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:289](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L289)

#### content

```ts
content: 
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

##### Type declaration

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

##### Generated

from oneof river.BlockchainTransaction.content

#### receipt?

```ts
optional receipt: object;
```

required fields

##### Generated

from field: river.BlockchainTransactionReceipt receipt = 1;

##### receipt.blockNumber

```ts
receipt.blockNumber: bigint;
```

###### Generated

from field: uint64 block_number = 3;

##### receipt.chainId

```ts
receipt.chainId: bigint;
```

###### Generated

from field: uint64 chain_id = 1;

##### receipt.from

```ts
receipt.from: Uint8Array;
```

###### Generated

from field: bytes from = 5;

##### receipt.logs

```ts
receipt.logs: object[];
```

###### Generated

from field: repeated river.BlockchainTransactionReceipt.Log logs = 6;

##### receipt.to

```ts
receipt.to: Uint8Array;
```

###### Generated

from field: bytes to = 4;

##### receipt.transactionHash

```ts
receipt.transactionHash: Uint8Array;
```

###### Generated

from field: bytes transaction_hash = 2;

#### solanaReceipt?

```ts
optional solanaReceipt: object;
```

##### Generated

from field: river.SolanaBlockchainTransactionReceipt solana_receipt = 2;

##### solanaReceipt.meta?

```ts
optional solanaReceipt.meta: object;
```

###### Generated

from field: river.SolanaBlockchainTransactionReceipt.Meta meta = 3;

##### solanaReceipt.meta.postTokenBalances

```ts
solanaReceipt.meta.postTokenBalances: object[];
```

###### Generated

from field: repeated river.SolanaBlockchainTransactionReceipt.Meta.TokenBalance post_token_balances = 2;

##### solanaReceipt.meta.preTokenBalances

```ts
solanaReceipt.meta.preTokenBalances: object[];
```

###### Generated

from field: repeated river.SolanaBlockchainTransactionReceipt.Meta.TokenBalance pre_token_balances = 1;

##### solanaReceipt.slot

```ts
solanaReceipt.slot: bigint;
```

###### Generated

from field: uint64 slot = 1;

##### solanaReceipt.transaction?

```ts
optional solanaReceipt.transaction: object;
```

###### Generated

from field: river.SolanaBlockchainTransactionReceipt.Transaction transaction = 2;

##### solanaReceipt.transaction.signatures

```ts
solanaReceipt.transaction.signatures: string[];
```

###### Generated

from field: repeated string signatures = 1;
