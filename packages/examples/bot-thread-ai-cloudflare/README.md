# Thread AI Bot - Cloudflare Workers

A Thread AI Bot deployed on Cloudflare Workers with Durable Objects for persistent state management. This bot creates AI-powered threaded conversations using OpenAI's GPT models.

## Features

- **Serverless Architecture**: Runs on Cloudflare Workers edge runtime
- **Persistent State**: Uses Durable Objects to maintain conversation context across threads
- **AI-Powered Responses**: Integrates with OpenAI API for intelligent thread responses
- **Automatic Threading**: Creates new threads for every message and maintains context
- **Edge Performance**: Global distribution with low latency via Cloudflare's network
- **Cost Effective**: Pay-per-use model with generous free tiers

## Architecture

```
User Message → Cloudflare Worker → Towns Bot SDK → Durable Object (Thread State) → OpenAI API → Response
```

- **Cloudflare Worker**: Handles incoming webhook requests
- **Towns Bot SDK**: Provides authentication and message handling
- **Durable Objects**: Persistent storage for thread conversations
- **OpenAI API**: Generates intelligent responses based on thread context

## Prerequisites

1. **Cloudflare Account**: [Sign up for Cloudflare](https://dash.cloudflare.com/sign-up)
2. **Towns Protocol App**: Registered app with private data and JWT secret
3. **OpenAI API Key**: [Get your API key](https://platform.openai.com/api-keys)
4. **Wrangler CLI**: Install with `npm install -g wrangler`

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your credentials:

```env
APP_PRIVATE_DATA_BASE64=your_base64_encoded_app_private_data
JWT_SECRET=your_jwt_secret_from_towns_app_registry
OPENAI_API_KEY=sk-your_openai_api_key
```

### 3. Local Development

Start the local development server:

```bash
yarn dev
```

This starts Wrangler's local development server with:

- Hot reloading
- Local Durable Objects simulation
- Environment variable loading from `.dev.vars`

The webhook will be available at: `http://localhost:8787/webhook`

### 4. Test Locally

You can test the webhook endpoint locally:

```bash
curl -X POST http://localhost:8787/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"test": "message"}'
```

## Deployment

### 1. Authenticate with Cloudflare

```bash
wrangler login
```

### 2. Configure Production Secrets

Set your production secrets:

```bash
wrangler secret put APP_PRIVATE_DATA_BASE64
wrangler secret put JWT_SECRET
wrangler secret put OPENAI_API_KEY
```

### 3. Deploy to Cloudflare Workers

```bash
yarn deploy
```

The bot will be deployed and available at:
`https://bot-thread-ai-cloudflare.your-subdomain.workers.dev`

### 4. Update Towns App Registry

Update your Towns app registration to point to the new webhook URL:
`https://bot-thread-ai-cloudflare.your-subdomain.workers.dev/webhook`

## Configuration

### Wrangler Configuration

The `wrangler.toml` file configures:

- **Node.js Compatibility**: Enables Node.js APIs for the Towns SDK
- **Durable Objects**: Configures thread state persistence
- **Environment Variables**: Sets up development/production environments
- **TypeScript Support**: Enables TypeScript compilation

### Bot Behavior

The bot automatically:

1. **Creates threads** for every new message
2. **Maintains conversation context** within each thread
3. **Generates AI responses** based on the full conversation history
4. **Sets bot identity** with username and display name
5. **Handles errors gracefully** with user-friendly messages

## Monitoring

### View Logs

Stream real-time logs:

```bash
yarn tail
```

### Cloudflare Dashboard

Monitor your Worker through the [Cloudflare Dashboard](https://dash.cloudflare.com):

- Request metrics and analytics
- Error rates and performance
- Durable Object storage usage
- Cost breakdown

## Development

### Project Structure

```
src/
├── index.ts           # Main Worker entry point
├── durable-object.ts  # Thread state Durable Object
└── types.ts          # TypeScript type definitions

wrangler.toml         # Cloudflare Workers configuration
package.json          # Dependencies and scripts
tsconfig.json         # TypeScript configuration
.dev.vars.example     # Environment variables template
```

### Key Components

#### Main Worker (`index.ts`)

- Initializes the Towns bot SDK
- Sets up event handlers for messages and thread messages
- Integrates with Durable Objects for state management
- Handles OpenAI API calls for response generation

#### Durable Object (`durable-object.ts`)

- Manages persistent thread state
- Provides API endpoints for state operations
- Handles conversation history storage
- Implements error handling for storage operations

#### Types (`types.ts`)

- Defines TypeScript interfaces
- Provides type safety for Cloudflare Workers APIs
- Ensures proper typing for thread state and environment

### Development

Type checking:

```bash
yarn typecheck
```

Linting:

```bash
yarn lint
```

## Cost Estimation

### Cloudflare Workers

- **Free Tier**: 100,000 requests/day
- **Paid**: $0.50 per million requests

### Durable Objects

- **Free Tier**: 1,000,000 requests/month
- **Paid**: $0.15 per million requests + $0.20/GB-month storage

### OpenAI API

- **GPT-4o-mini**: ~$0.0015 per 1K tokens
- **Average**: ~$0.005 per conversation turn

**Estimated Monthly Cost**: $5-15 for moderate usage (1000 conversations/month)

## Troubleshooting

### Common Issues

1. **Node.js compatibility errors**: Ensure `node_compat = true` in wrangler.toml
2. **Durable Object binding errors**: Check the binding name matches in wrangler.toml
3. **OpenAI API errors**: Verify your API key and rate limits
4. **Towns SDK errors**: Ensure your app private data and JWT secret are correct

### Debug Mode

Enable debug logging by setting console.log statements in your code. View logs with:

```bash
wrangler tail --format pretty
```

### Support

- **Towns Protocol**: [Documentation](https://docs.towns.com)
- **Cloudflare Workers**: [Documentation](https://developers.cloudflare.com/workers)
- **OpenAI API**: [Documentation](https://platform.openai.com/docs)

## License

This example is part of the Towns Protocol project and follows the same license terms.
