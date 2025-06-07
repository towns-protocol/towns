# Function: makeParsedEvent()

```ts
function makeParsedEvent(
   event, 
   hash, 
   signature): object;
```

Defined in: [packages/sdk/src/sign.ts:306](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sign.ts#L306)

## Parameters

### event

`StreamEvent`

### hash

`undefined` | `Uint8Array`\<`ArrayBufferLike`\>

### signature

`undefined` | `Uint8Array`\<`ArrayBufferLike`\>

## Returns

`object`

### creatorUserId

```ts
creatorUserId: string;
```

### event

```ts
event: StreamEvent;
```

### hash

```ts
hash: Uint8Array<ArrayBufferLike>;
```

### hashStr

```ts
hashStr: string;
```

### signature

```ts
signature: undefined | Uint8Array<ArrayBufferLike>;
```
