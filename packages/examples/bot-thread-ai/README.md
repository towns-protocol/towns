# Thread AI Bot

A bot that creates AI-powered threads in response to messages using OpenAI's GPT model.

## Features

- Creates new threads for every message
- Maintains conversation context within threads
- Uses OpenAI API for intelligent responses
- Sets custom username and display name

## Setup

1. Copy `.env.sample` to `.env` and fill in your credentials
2. Install dependencies: `yarn install`
3. Run the bot: `yarn dev`

## Environment Variables

- `APP_PRIVATE_DATA_BASE64`: Your Towns app private data
- `JWT_SECRET`: JWT secret for authentication
- `RIVER_ENV`: Environment (development/production)
- `PORT`: Port to run the bot on
- `OPENAI_API_KEY`: Your OpenAI API key

## Usage

Simply send any message in a channel where the bot is active, and it will create a threaded AI response.
