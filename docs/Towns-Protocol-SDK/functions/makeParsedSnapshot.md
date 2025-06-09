# Function: makeParsedSnapshot()

```ts
function makeParsedSnapshot(
   snapshot, 
   hash, 
   signature): object;
```

Defined in: [packages/sdk/src/sign.ts:321](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sign.ts#L321)

## Parameters

### snapshot

`Snapshot`

### hash

`undefined` | `Uint8Array`\<`ArrayBufferLike`\>

### signature

`undefined` | `Uint8Array`\<`ArrayBufferLike`\>

## Returns

`object`

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

### snapshot

```ts
snapshot: Snapshot;
```
