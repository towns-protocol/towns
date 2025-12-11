# Quickstart Bot

A simple, barebones bot example perfect for beginners learning to build Towns bots.

# Features

- **Slash commands**: Registering and handling `/commands`
- **Message handling**: Detecting keywords in messages
- **Sending messages**: Posting messages to channels
- **Adding reactions**: Attaching emoji reactions to messages
- **Reaction events**: Responding to user reactions

## Slash Commands

- `/help` - Shows available commands and message triggers
- `/time` - Displays the current server time

## Message Triggers

- Say "hello" - Bot greets you back
- Say "ping" - Bot responds with "Pong!" and latency
- Say "react" - Bot adds a thumbs up reaction to your message

You will need to mention the bot if you're using the `Mentions, Commands, Replies & Reactions` message behavior for your bot.

## Reaction Handling

- React with 👋 to any message - Bot responds with "I saw your wave!"

# Setup

1. Copy `.env.sample` to `.env` and fill in your credentials:

   ```bash
   cp .env.sample .env
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Run the bot:
   ```bash
   bun run dev
   ```

# Environment Variables

Required variables in `.env`:

- `APP_PRIVATE_DATA` - Your Towns app private data (base64 encoded)
- `JWT_SECRET` - JWT secret for webhook authentication
- `PORT` - Port to run the bot on (optional, defaults to 5123)

# Usage

Once the bot is running, installed to a space and added to a channel:

**Try the slash commands:**

- `/help` - See all available features
- `/time` - Get the current time

**Try the message triggers:**

- Type "hello" anywhere in your message
- Type "ping" to check bot latency
- Type "react" to get a reaction

**Try reactions:**

- Add a 👋 reaction to any message

# Code Structure

The bot consists of two main files:

## `src/commands.ts`

Defines the slash commands available to users. Commands registered here appear in the slash command menu.

## `src/index.ts`

Main bot logic with:

1. **Bot initialization** (`makeTownsBot`) - Creates bot instance with credentials and commands
2. **Slash command handlers** (`onSlashCommand`) - Handle `/help` and `/time` commands
3. **Message handler** (`onMessage`) - Respond to message keywords (hello, ping, react)
4. **Reaction handler** (`onReaction`) - Respond to emoji reactions (👋)
5. **Bot server setup** (`bot.start()`) - Starts the bot server with a Hono HTTP server

## Extending this Bot

To add your own features:

1. **Add a slash command:**
   - Add to `src/commands.ts`
   - Go to `src/index.ts` and create a handler with `bot.onSlashCommand('yourcommand', async (handler, event) => { ... })`

2. **Add message triggers:**
   - Add conditions in the `bot.onMessage()` handler

3. **Handle more events:**
   - Use `bot.onReaction()`, `bot.onMessageEdit()`, `bot.onChannelJoin()`, etc.
