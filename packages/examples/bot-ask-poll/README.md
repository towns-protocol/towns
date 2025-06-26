# Ask Poll Bot

A bot that creates interactive polls with emoji reactions for voting.

## Features

- Create polls with custom questions and multiple choice answers
- Automatic emoji reactions for voting
- Real-time results display
- Vote removal support via reaction redaction

## Setup

1. Copy `.env.sample` to `.env` and fill in your credentials
2. Install dependencies: `yarn install`
3. Run the bot: `yarn dev`

## Environment Variables

- `APP_PRIVATE_DATA_BASE64`: Your Towns app private data
- `JWT_SECRET`: JWT secret for authentication
- `RIVER_ENV`: Environment (development/production)
- `PORT`: Port to run the bot on

## Usage

Create a poll by sending a message in this format:

```
@poll Should we implement feature X? | Yes | No | Maybe
```

The bot will:

1. Create a poll message with the question
2. Add emoji reactions for each option
3. Track votes and display results
4. Update results in real-time as people vote

Users can vote by clicking the emoji reactions and change their vote by removing and adding different reactions.
