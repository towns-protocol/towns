# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

This is the `@towns-protocol/bot` package - a bot framework for Towns Protocol. It provides APIs for building bots that interact with Towns spaces, channels, and direct messages using end-to-end encryption.

## Commands

### Development Commands (from this directory)
```bash
# Build TypeScript
yarn build

# Run tests
yarn test                 # Run all tests
yarn test:ci:multi:ent   # Run tests with environment variables from local_dev
yarn test:watch          # Run tests in watch mode  

# Code quality
yarn lint                # Check for linting issues
yarn lint:fix           # Fix linting issues
yarn typecheck          # Type check without building

# Clean build artifacts
yarn clean              # Remove dist directory
```

### Monorepo Commands (from root)
```bash
# Build this package as part of monorepo
turbo build --filter @towns-protocol/bot

# Run tests for this package  
turbo test --filter @towns-protocol/bot

# Lint this package
turbo lint --filter @towns-protocol/bot
```

## Architecture

### Core Components

**TownsBot Class (`bot.ts:241-867`)**: Main entry point for creating and managing bots. Handles JWT authentication, webhook processing, and event routing.

**Event Processing (`bot.ts:346-734`)**: Central event handling system that:
- Receives encrypted events via webhook
- Decrypts messages using group encryption sessions
- Routes events to appropriate handlers
- Manages encryption keys and sessions

**BotActions (`bot.ts:869-1117`)**: Set of methods available to event handlers for interacting with Towns:
- Message operations (send, edit, react, remove)
- Encryption operations (key management, session decryption)
- Permission checks
- Web3 contract interactions

### Event Handlers

The bot framework provides these event handlers:

**`onMessage`** - Unified handler for ALL message types
- Payload includes:
  - `message` (decrypted message text)
  - `replyId` (if this is a reply, the eventId of the message being replied to)
  - `threadId` (if in a thread, the eventId of the initial thread message)
  - `mentions` (array of mentioned users)
  - `isMentioned` (boolean - true if bot was mentioned)
  - `isDm` (boolean - true if direct message)
  - `isGdm` (boolean - true if group direct message)
- Check context flags to handle specific scenarios

**`onMessageEdit`** - Message edits
- Payload includes:
  - `refEventId` (ID of edited message)
  - `message` (new message content)
  - `replyId` (if the edited message was a reply)
  - `threadId` (if the edited message was in a thread)
  - `mentions` (array of mentioned users)
  - `isMentioned` (boolean - true if bot was mentioned)

**`onReaction`** - Reactions to messages
- Payload includes: `reaction`, `messageId`, `userId`

**`onRedaction`** / **`onEventRevoke`** - Message/event removals
- Payload includes: `refEventId`

**`onTip`** - Tips sent in channels
- Payload includes: `messageId`, `senderAddress`, `receiverAddress`, `amount`, `currency`

**`onChannelJoin`** / **`onChannelLeave`** - Membership changes

**`onSlashCommand`** - Slash command invocations
- Payload includes: `command`, `args`, `mentions`, `replyId`, `threadId`
- Executes independently - does NOT trigger onMessage

**`onStreamEvent`** - Raw stream events for advanced use cases

### Bot Actions API

Methods available on the `handler` parameter in event callbacks:

#### Exported Types for Building Abstractions

The `@towns-protocol/bot` package exports several types useful for building abstractions:

**`BotHandler`** - Type representing all methods available on the `handler` parameter. Use this when building helper functions, middleware, or utilities that need to accept a handler as a parameter.

**`BasePayload`** - Type containing common fields present in all event payloads (`userId`, `spaceId`, `channelId`, `eventId`, `createdAt`). Use this when building generic event processing utilities that work across different event types.

**`MessageOpts`** - Type defining options for sending messages (threadId, replyId, mentions, attachments, ephemeral). Use this when building message utilities that need to accept or manipulate message sending options.

**Message Operations:**
- `sendMessage(streamId, message, opts?, tags?)` - Send to channel
  - `opts.ephemeral`: Send ephemeral message (won't persist after refresh)
  - `opts.threadId`: Send message in a thread
  - `opts.replyId`: Reply to a specific message
  - `opts.mentions`: Array of user mentions
  - `opts.attachments`: Array of attachments (see "Sending Attachments" section)
    - Image from URL: `{ type: 'image', url: string, alt?: string }`
- `editMessage(streamId, messageId, message, tags?)` - Edit message
- `sendReaction(streamId, messageId, reaction, tags?)` - Add reaction
- `removeEvent(streamId, messageId, tags?)` - Remove event
- `adminRemoveEvent(streamId, messageId)` - Admin removal

**Encryption Operations:**
- `uploadDeviceKeys()` - Upload bot's encryption keys
- `sendKeySolicitation(streamId, sessionIds)` - Request missing keys
- `decryptSessions(streamId, sessions)` - Decrypt group sessions

**Permission Operations:**
- `hasAdminPermission(userId, spaceId)` - Check admin status
- `checkPermission(streamId, userId, permission)` - Check specific permission

**Moderation Operations:**
- `ban(userId, spaceId)` - Ban a user from a space (requires `ModifyBanning` permission)
- `unban(userId, spaceId)` - Unban a user from a space (requires `ModifyBanning` permission)

**Web3 Operations:**
- `writeContract(tx)` - Execute contract write
- `readContract(parameters)` - Read contract state

**Snapshot Data Access:**
- `bot.snapshot.getChannelInception(streamId)` - Get channel settings and inception data
- `bot.snapshot.getUserMemberships(streamId)` - Get user's space memberships
- `bot.snapshot.getSpaceMemberships(streamId)` - Get space membership list
- Note: Snapshot data may be outdated - it's a point-in-time view
- Uses dynamic Proxy-based getters for type-safe access

### Encryption & Decryption

The bot framework handles E2E encryption automatically:

1. **Incoming Messages**: 
   - Events arrive encrypted via webhook
   - Framework decrypts using group encryption sessions (`bot.ts:389-406`)
   - Decrypted content is passed to handlers

2. **Outgoing Messages**:
   - Framework encrypts messages before sending (`bot.ts:887-905`)
   - Manages encryption devices and keys
   - Handles key solicitation when needed

3. **Key Management**:
   - Bot maintains encryption device with device/fallback keys
   - Sessions are imported and stored per stream
   - Missing sessions trigger key solicitation

### Message Payload Structure

All event payloads include base fields:
```typescript
{
  userId: string      // User who triggered event
  spaceId: string     // Space ID
  channelId: string   // Channel/stream ID
  eventId: string     // Event ID
  createdAt: Date     // Event timestamp
}
```

### Testing Patterns

Tests use Vitest and require a running Towns development environment:

```typescript
// Create bot with test credentials
const bot = await makeTownsBot(privateData, env)

// Register handlers
bot.onMessage((handler, { message }) => {
    // ...
})

// Start bot
const { handler } = await bot.start()
```

## Common Development Tasks

### Handling Messages
```typescript
bot.onMessage(async (handler, event) => {
  // Filter bot's own messages
  if (event.userId === bot.botId) return
  
  // Check if mentioned
  if (event.isMentioned) {
    await handler.sendMessage(event.channelId, "You mentioned me!")
  }
  
  // Check if in thread
  if (event.threadId) {
    // threadId is the eventId of the initial thread message
    await handler.sendMessage(event.channelId, "Thread reply", {
      threadId: event.threadId
    })
  }
  
  // Check if it's a reply
  if (event.replyId) {
    // replyId is the eventId of the message being replied to
    await handler.sendMessage(event.channelId, "Thanks for the reply!")
  }
  
  // Handle combinations (e.g., mentioned in a thread)
  if (event.threadId && event.isMentioned) {
    await handler.sendMessage(event.channelId, "You mentioned me in a thread!")
  }
})
```

### Implementing Slash Commands
```typescript
const commands = [
  { name: "help", description: "Show help" }
]

const bot = await makeTownsBot(privateData, env, { commands })

bot.onSlashCommand("help", async (handler, { channelId, args }) => {
  await handler.sendMessage(channelId, "Available commands...")
})
```

### Permission Checks
```typescript
bot.onMessage(async (handler, { userId, spaceId, channelId, eventId }) => {
  if (await handler.hasAdminPermission(userId, spaceId)) {
    // Admin-only functionality
    await handler.adminRemoveEvent(channelId, eventId)
  }
})
```

### Sending Ephemeral Messages
```typescript
bot.onSlashCommand("ai", async (handler, { channelId, args }) => {
  // Send temporary status message that won't persist after refresh
  await handler.sendMessage(
    channelId,
    "I'll think about it. This may take a while...",
    { ephemeral: true }
  )

  // Process the complex task
  const result = await processComplexTask(args)

  // Send the actual persistent result
  await handler.sendMessage(channelId, result)
})
```

### Sending Attachments

The bot supports two types of attachments:

#### Image Attachments from URLs

Use `type: 'image'` to send images from URLs. The framework automatically:
- Fetches and validates the URL
- Checks Content-Type is `image/*` (non-images are skipped with console warning)
- Extracts image dimensions using `image-size` library
- Gracefully handles failures (404, network errors)

```typescript
bot.onSlashCommand("show", async (handler, { channelId, args }) => {
  const imageUrl = args[0]

  await handler.sendMessage(channelId, "Here's your image!", {
    attachments: [
      {
        type: 'image',
        url: imageUrl,
        alt: 'Description for accessibility' // Optional
      }
    ]
  })
})
```

**Important Notes:**
- Invalid/non-image URLs are skipped gracefully (message still sends)
- Non-image Content-Types trigger console warning and are skipped
- Image dimensions are auto-detected for URL-based images
- All attachments are end-to-end encrypted automatically

### Moderation Operations
```typescript
// Ban/unban users (requires ModifyBanning permission)
bot.onSlashCommand("ban", async (handler, { channelId, spaceId, args, userId }) => {
  // Check if the command issuer has admin permission
  if (!await handler.hasAdminPermission(userId, spaceId)) {
    await handler.sendMessage(channelId, "Only admins can use this command")
    return
  }
  
  const userToBan = args[0] // Expecting user address as first argument
  if (!userToBan) {
    await handler.sendMessage(channelId, "Please specify a user address to ban")
    return
  }
  
  try {
    // Ban the user - bot must have ModifyBanning permission
    const result = await handler.ban(userToBan, spaceId)
    await handler.sendMessage(channelId, `Successfully banned user ${userToBan}`)
  } catch (error) {
    await handler.sendMessage(channelId, `Failed to ban user: ${error.message}`)
  }
})

bot.onSlashCommand("unban", async (handler, { channelId, spaceId, args }) => {
  const userToUnban = args[0]
  
  try {
    // Unban the user - bot must have ModifyBanning permission
    const result = await handler.unban(userToUnban, spaceId)
    await handler.sendMessage(channelId, `Successfully unbanned user ${userToUnban}`)
  } catch (error) {
    await handler.sendMessage(channelId, `Failed to unban user: ${error.message}`)
  }
})
```

## Important Notes

- All messages are end-to-end encrypted by default
- The bot framework automatically handles encryption/decryption
- Bot only supports channel messages (no DM/GDM support)
- Bot needs appropriate permissions in spaces to send messages
- **Ban/Unban operations require `ModifyBanning` permission**: The bot's app must be registered with `ModifyBanning` permission and properly installed on the space for ban/unban operations to work
- JWT authentication is required for webhook security
- Messages include both encrypted and decrypted forms in processing
- Use environment variables for sensitive configuration
- The framework uses a single unified `onMessage` handler for all message types (regular messages, replies, thread messages, mentions). Use the context flags (`isMentioned`, `replyId`, `threadId`) to handle specific scenarios
- **Changes to this package should be reflected in example bots**: When modifying the bot framework, update the example implementations in `packages/examples/bot-*` directories to demonstrate new features or API changes
- **Update bot-quickstart AGENTS.md**: When making architectural or behavioral changes to the bot framework, also update `/packages/examples/bot-quickstart/AGENTS.md` to reflect these changes, especially regarding stateless architecture, handler routing, and payload structures
