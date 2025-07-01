# Quickstart Bot Fly.io

A simple, barebones bot example perfect for beginners learning to build Towns bots.

## What This Bot Does

This bot demonstrates the basic functionality of a Towns bot:

- **Greetings**: Responds to "hello" with a friendly greeting
- **Help**: Shows available commands when someone says "help"
- **Ping/Pong**: Classic ping-pong response
- **Time**: Shows current time when requested
- **Reactions**: Adds thumbs up reaction when someone mentions "react"
- **Reaction Responses**: Responds to wave emoji reactions

## Features Demonstrated

- Message handling with keyword detection
- Sending messages back to channels
- Adding emoji reactions to messages
- Responding to emoji reactions from users
- Setting bot username and display name
- Basic user filtering (ignoring bot's own messages)

## Setup

1. Copy `.env.sample` to `.env` and fill in your credentials
2. Install dependencies: `yarn install`
3. Run the bot: `yarn dev`

## Deploy

```bash
fly launch --now
```

or `fly deploy` if you already have a fly.toml file.

You will need to set environment variables in the fly.io dashboard or use `fly secrets set` to set them.

You can set them all at once from your `.env` file with:

```bash
cat .env | tr '\n' ' ' | xargs flyctl secrets set
```

Update `[http_service]` in the `fly.toml` file to `internal_port = 80` or the port you want to run the bot on.

```toml
[http_service]
  internal_port = 8080 # or the port you want to run the bot on
```

Fly.io will automatically scale the bot to 0 machines when it's not in use.

## Environment Variables

- `APP_PRIVATE_DATA_BASE64`: Your Towns app private data
- `JWT_SECRET`: JWT secret for authentication
- `RIVER_ENV`: Environment (development/production)
- `PORT`: Port to run the bot on

## Usage

Once the bot is running in a channel, try these commands:

- Type "hello" → Bot will greet you
- Type "help" → Bot will show available commands
- Type "ping" → Bot will respond with "Pong!"
- Type "time" → Bot will show current time
- Type "react" → Bot will add a thumbs up reaction
- React with 👋 to any message → Bot will respond

## Code Structure

The bot is implemented as a single file (`src/index.ts`) with:

1. **Bot Creation**: Initialize the bot with environment variables
2. **Channel Join Handler**: Set bot name when joining channels
3. **Message Handler**: Process incoming messages and respond appropriately
4. **Reaction Handler**: Respond to emoji reactions from users
5. **Server Setup**: Start the bot HTTP server

This is the perfect starting point for building more complex bots!
