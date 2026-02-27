---
"@towns-protocol/bot": patch
---

Added support for sending messages in GDM streams

```ts
bot.onMessage((handler, { isGdm, isDm, spaceId }) => {
  if (isDm || isGdm) {
    // This message was sent in a DM or GDM - spaceId is undefined
    return;
  }
  // This message was sent in a space channel - spaceId is available
  console.log(`Space: ${spaceId}`);
});
```
