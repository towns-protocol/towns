# Class: NotificationService

Defined in: [packages/sdk/src/notificationService.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/notificationService.ts#L11)

## Constructors

### Constructor

```ts
new NotificationService(): NotificationService;
```

#### Returns

`NotificationService`

## Methods

### authenticate()

```ts
static authenticate(
   signerContext, 
   serviceUrl, 
   opts?): Promise<{
  finishResponse: FinishAuthenticationResponse;
  notificationRpcClient: NotificationRpcClient;
  startResponse: StartAuthenticationResponse;
}>;
```

Defined in: [packages/sdk/src/notificationService.ts:50](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/notificationService.ts#L50)

#### Parameters

##### signerContext

[`SignerContext`](../interfaces/SignerContext.md)

##### serviceUrl

`string`

##### opts?

[`RpcOptions`](../interfaces/RpcOptions.md)

#### Returns

`Promise`\<\{
  `finishResponse`: `FinishAuthenticationResponse`;
  `notificationRpcClient`: [`NotificationRpcClient`](../type-aliases/NotificationRpcClient.md);
  `startResponse`: `StartAuthenticationResponse`;
\}\>

***

### authenticateWithSigner()

```ts
static authenticateWithSigner(
   userId, 
   signer, 
   serviceUrl, 
   opts?): Promise<{
  finishResponse: FinishAuthenticationResponse;
  notificationRpcClient: NotificationRpcClient;
  startResponse: StartAuthenticationResponse;
}>;
```

Defined in: [packages/sdk/src/notificationService.ts:68](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/notificationService.ts#L68)

#### Parameters

##### userId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### signer

`Signer`

##### serviceUrl

`string`

##### opts?

[`RpcOptions`](../interfaces/RpcOptions.md)

#### Returns

`Promise`\<\{
  `finishResponse`: `FinishAuthenticationResponse`;
  `notificationRpcClient`: [`NotificationRpcClient`](../type-aliases/NotificationRpcClient.md);
  `startResponse`: `StartAuthenticationResponse`;
\}\>
