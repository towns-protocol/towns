# Function: getSpaceReviewEventData()

```ts
function getSpaceReviewEventData(logs, senderAddress): SpaceReviewEventObject;
```

Defined in: [packages/web3/src/space/IReviewShim.ts:112](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/IReviewShim.ts#L112)

Get the review event data from a receipt, public static for ease of use in the SDK

## Parameters

### logs

`object`[]

### senderAddress

`string`

The address of the sender

## Returns

[`SpaceReviewEventObject`](../interfaces/SpaceReviewEventObject.md)

The review event data
