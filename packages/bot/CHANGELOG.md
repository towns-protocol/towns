# @towns-protocol/bot

## 1.0.4

### Patch Changes

- Updated dependencies []:
  - @towns-protocol/encryption@1.0.4
  - @towns-protocol/generated@1.0.4
  - @towns-protocol/proto@1.0.4
  - @towns-protocol/sdk@1.0.4
  - @towns-protocol/sdk-crypto@1.0.4
  - @towns-protocol/utils@1.0.4
  - @towns-protocol/web3@1.0.4

## 1.0.3

### Patch Changes

- [#4869](https://github.com/towns-protocol/towns/pull/4869) [`6790ed3`](https://github.com/towns-protocol/towns/commit/6790ed34ecada1eae3c29adb7d03dcd6b7ceda76) Thanks [@miguel-nascimento](https://github.com/miguel-nascimento)! - Use `undefined` instead of `null` to represent `spaceId` in DM context

- Updated dependencies []:
  - @towns-protocol/encryption@1.0.3
  - @towns-protocol/generated@1.0.3
  - @towns-protocol/proto@1.0.3
  - @towns-protocol/sdk@1.0.3
  - @towns-protocol/sdk-crypto@1.0.3
  - @towns-protocol/utils@1.0.3
  - @towns-protocol/web3@1.0.3

## 1.0.2

### Patch Changes

- Updated dependencies []:
  - @towns-protocol/encryption@1.0.2
  - @towns-protocol/generated@1.0.2
  - @towns-protocol/proto@1.0.2
  - @towns-protocol/sdk@1.0.2
  - @towns-protocol/sdk-crypto@1.0.2
  - @towns-protocol/utils@1.0.2
  - @towns-protocol/web3@1.0.2

## 1.0.1

### Patch Changes

- [#4794](https://github.com/towns-protocol/towns/pull/4794) [`7227332`](https://github.com/towns-protocol/towns/commit/72273323a52bce2710708397a45120a9ac5e91a3) Thanks [@miguel-nascimento](https://github.com/miguel-nascimento)! - Bots can now receive messages from DMs, which doesn't contain a `spaceId`. You can check `isDm` to type guard `spaceId`.

  ```ts
  bot.onMessage(handler, ({ isDm, spaceId }) => {
    if (isDm) {
      // This message was sent in a DM - spaceId is null
      console.log("DM channel, no space");
    } else {
      // This message was sent in a space channel - spaceId is available
      console.log(`Space: ${spaceId}`);
    }
  });
  ```

- Updated dependencies [[`d81db9a`](https://github.com/towns-protocol/towns/commit/d81db9ac0d730377aae114df682589975385ba8a), [`d81db9a`](https://github.com/towns-protocol/towns/commit/d81db9ac0d730377aae114df682589975385ba8a), [`d81db9a`](https://github.com/towns-protocol/towns/commit/d81db9ac0d730377aae114df682589975385ba8a)]:
  - @towns-protocol/web3@1.0.1
  - @towns-protocol/encryption@1.0.1
  - @towns-protocol/sdk@1.0.1
  - @towns-protocol/sdk-crypto@1.0.1
  - @towns-protocol/generated@1.0.1
  - @towns-protocol/proto@1.0.1
  - @towns-protocol/utils@1.0.1
