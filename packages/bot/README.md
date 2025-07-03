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

## Running Bots

The `@towns-protocol/bot` package is compatible with the following approaches:

- **Bun ESM** - Bun runtime with ES modules
- **esbuild + Node CJS** - Bundled CommonJS for Node.js
- **tsx ESM** - TypeScript execution with ES modules

For working examples and configurations, see the [examples directory](../examples/).

### tsx with ESM

Install tsx, then run your bot with:

```bash
tsx src/index.ts
```

### Bundled with esbuild as CommonJS

Install esbuild, then bundle your bot to a single CJS file and run with Node.js:

You can take a look at the [bot-quickstart example](../examples/bot-quickstart/esbuild.config.mjs) for a working esbuild configuration.

```bash
# Build the bundle
yarn build

# Run with Node.js
node dist/bot.cjs
```

### Bun with ESM

```bash
bun run src/index.ts
```
