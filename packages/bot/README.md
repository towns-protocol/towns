# @towns-protocol/bot

A bot framework for Towns.

## Usage

```ts
import { makeTownsBot } from "@towns-protocol/bot";
import { serve } from "@hono/node-server";

const bot = await makeTownsBot("<app-private-data-base64>", "<env>");

bot.onMentioned((client, { channelId }) =>
  client.sendMessage(channelId, "Hello, world!"),
);

const { fetch } = await bot.start();
serve({ fetch });
```
