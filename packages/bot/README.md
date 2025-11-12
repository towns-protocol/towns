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

## Identity Metadata (ERC-8004)

Bots can optionally define ERC-8004 compliant identity metadata for agent discovery and trust.

### Minimal Example

Create `identity.ts`:

```ts
import type { BotIdentityConfig } from "@towns-protocol/bot";

const identity = {
  name: "My Bot",
  description: "A helpful bot for Towns",
  image: "https://example.com/bot-logo.png",
  domain: "mybot.example.com",
} as const satisfies BotIdentityConfig;

export default identity;
```

Use in bot setup:

```ts
import identity from "./identity";

const bot = await makeTownsBot(
  process.env.APP_PRIVATE_DATA!,
  process.env.JWT_SECRET!,
  {
    commands,
    identity,
  },
);

// Get metadata for hosting at /.well-known/agent-metadata.json
const metadata = bot.getIdentityMetadata();
app.get("/.well-known/agent-metadata.json", metadata);
```

### Advanced Example

For full ERC-8004 compliance with endpoints and trust models:

```ts
import type { BotIdentityConfig } from "@towns-protocol/bot";

const identity = {
  name: "Advanced Bot",
  description: "AI-powered agent with multi-protocol support",
  image: "https://example.com/bot-logo.png",
  motto: "Building the future of agent economies",
  domain: "bot.example.com",

  endpoints: [
    {
      name: "A2A",
      endpoint: "https://bot.example.com/.well-known/agent-card.json",
      version: "0.3.0",
    },
    {
      name: "MCP",
      endpoint: "https://mcp.bot.example.com/",
      version: "2025-06-18",
    },
  ],

  registrations: [],

  supportedTrust: ["reputation", "crypto-economic"],

  attributes: [
    { trait_type: "Category", value: "Gateway" },
    { trait_type: "Model", value: "GPT-4" },
  ],
} as const satisfies BotIdentityConfig;

export default identity;
```

The bot automatically adds `agentWallet` endpoint using the bot's app address and `A2A` endpoint if domain is configured.

## Debug Logging

Bot framework uses `debug` package for logging.
You can enable by setting the `DEBUG` environment variable to `csb:bot`.

```bash
DEBUG=csb:bot node dist/bot.cjs
```
