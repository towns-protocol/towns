# @river-build/bot

A bot framework for Towns.

## Usage

```ts
import { makeTownsBot } from "@river-build/bot";

const bot = await makeTownsBot("<private-key>", makeRiverConfig("gamma"));

bot.onBotMention((client, { channelId }) =>
  client.sendMessage(channelId, "Hello, world!"),
);

bot.start(3000);
```
