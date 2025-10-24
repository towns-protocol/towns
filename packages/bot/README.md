# @towns-protocol/bot

A bot framework for Towns.

## Installing

We suggest users to quickstart a project using our cli.

```bash
$ bunx towns-bot init
```

If you prefer to install manually:

```bash
$ bun add @towns-protocol/bot viem hono
```

## Usage

With Node:

```ts
import { makeTownsBot } from "@towns-protocol/bot";
import { serve } from "@hono/node-server";

const app = new Hono();
const bot = await makeTownsBot("<app-private-data-base64>", "<jwt-secret>");

bot.onMessage((handler, { channelId, isMentioned }) => {
  if (isMentioned) {
    handler.sendMessage(channelId, "Hello, world!");
  }
});

const { jwtMiddleware, handler } = bot.start();
app.post("/webhook", jwtMiddleware, handler);

serve({ fetch: app.fetch });
```

With Bun:

```ts
import { makeTownsBot } from "@towns-protocol/bot";

const app = new Hono();
const bot = await makeTownsBot("<app-private-data-base64>", "<jwt-secret>");

bot.onMessage((handler, { channelId, isMentioned }) => {
  if (isMentioned) {
    handler.sendMessage(channelId, "Hello, world!");
  }
});

const { jwtMiddleware, handler } = bot.start();
app.post("/webhook", jwtMiddleware, handler);

export default app;
```

## Debug Logging

Bot framework uses `debug` package for logging.
You can enable by setting the `DEBUG` environment variable to `csb:bot`.

```bash
DEBUG=csb:bot node dist/bot.cjs
```
