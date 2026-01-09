---
"@towns-protocol/bot": patch
---

Bots can now receive messages from DMs, which doesn't contain a `spaceId`. You can check `isDm` to type guard `spaceId`.

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
