# Quickstart Bot

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

## Environment Variables

- `APP_PRIVATE_DATA`: Your Towns app private data
- `JWT_SECRET`: JWT secret for authentication
- `PORT`: Port to run the bot on (optional, defaults to 5123)

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
