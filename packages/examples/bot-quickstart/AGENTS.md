# AGENTS.md

This file provides comprehensive guidance to AI agents (Claude Code, GitHub Copilot, etc.) for building Towns Protocol bots.

## Quick Start for AI Agents

To build a bot, you need:
1. **APP_PRIVATE_DATA** - Bot authentication credentials (base64 encoded)
2. **JWT_SECRET** - Webhook security token
3. **Event handlers** - Functions that respond to Towns events
4. **Deployment environment** - Server to host the webhook endpoint

## Critical Architecture Concepts

### STATELESS EVENT PROCESSING - MOST IMPORTANT

**The bot framework is completely stateless. Each event is isolated:**

- **NO message history** - Cannot retrieve previous messages
- **NO thread context** - Only get `threadId`, not original message content
- **NO reply context** - Only get `replyId`, not the message being replied to
- **NO conversation memory** - Each webhook call is independent
- **NO user session** - Cannot track users across events

**Implications:**
- You MUST store context externally if needed (database, in-memory)
- Design interactions that work with single events
- Cannot implement "conversation flows" without storage

### Event Flow Architecture

```
User Action → Towns Server → Webhook POST → JWT Verify → Decrypt → Route → Handler → Response
```

1. **Webhook Reception**: Encrypted events arrive via POST to `/webhook`
2. **JWT Verification**: Validates request authenticity
3. **Decryption**: Framework auto-decrypts using group sessions
4. **Event Routing**: 
   - Slash commands → Direct handler call (no message event)
   - All other messages → `onMessage` handler
5. **Handler Execution**: Your code processes the decrypted payload

## Complete Event Handler Reference

### Base Payload (ALL Events Include These)

```typescript
{
  userId: string      // Hex address with 0x prefix (e.g., "0x1234...")
  spaceId: string     // Space identifier
  channelId: string   // Channel/stream identifier  
  eventId: string     // Unique event ID (use for replies/threads)
  createdAt: Date     // Event timestamp (use for latency: Date.now() - createdAt)
}
```

### `onMessage` - Primary Message Handler

**When it fires:** Any non-slash-command message (including mentions, replies, threads)

**Full Payload:**
```typescript
{
  ...basePayload,
  message: string,           // Decrypted message text
  replyId?: string,         // If reply: eventId of message being replied to
  threadId?: string,        // If thread: eventId of thread's first message
  isMentioned: boolean,     // True if bot was @mentioned
  mentions: Array<{         // All mentioned users
    userId: string,         // User's hex address
    displayName: string     // Display name used in mention
  }>
}
```

**Common Patterns:**
```typescript
bot.onMessage(async (handler, event) => {
  // Mentioned bot
  if (event.isMentioned) {
    await handler.sendMessage(event.channelId, "You mentioned me!")
  }
  
  // Thread message
  if (event.threadId) {
    // Note: You don't know what the original thread message said
    await handler.sendMessage(event.channelId, "Continuing thread...", {
      threadId: event.threadId
    })
  }
  
  // Reply to message
  if (event.replyId) {
    // Note: You don't know what message you're replying to
    await handler.sendMessage(event.channelId, "I see you replied!")
  }
  
  // Mentioned in thread (combine flags)
  if (event.threadId && event.isMentioned) {
    await handler.sendMessage(event.channelId, "Mentioned in thread!", {
      threadId: event.threadId
    })
  }
})
```

### `onSlashCommand` - Command Handler

**When it fires:** User types `/command args`
**IMPORTANT:** Does NOT trigger `onMessage` - they're mutually exclusive

**Full Payload:**
```typescript
{
  ...basePayload,
  command: string,          // Command name (without /)
  args: string[],          // Arguments split by spaces
  mentions: Array<{        // Users mentioned in command
    userId: string,
    displayName: string
  }>,
  replyId?: string,        // If command was used in reply
  threadId?: string        // If command was used in thread
}
```

**Setup Required:**
1. Define commands in `src/commands.ts`:
```typescript
export const commands = [
  { name: "help", description: "Show help" },
  { name: "poll", description: "Create a poll" }
] as const
```

2. Pass to bot initialization:
```typescript
const bot = await makeTownsBot(privateData, jwtSecret, { commands })
```

3. Sync commands with Towns:
```bash
npx towns-bot update-commands src/commands.ts <bearer-token>
```

4. Register handlers:
```typescript
bot.onSlashCommand("help", async (handler, event) => {
  await handler.sendMessage(event.channelId, "Commands: /help, /poll")
})

bot.onSlashCommand("poll", async (handler, event) => {
  const question = event.args.join(" ")
  if (!question) {
    await handler.sendMessage(event.channelId, "Usage: /poll <question>")
    return
  }
  // Create poll...
})
```

### `onReaction` - Reaction Handler

**When it fires:** User adds emoji reaction to a message

**Full Payload:**
```typescript
{
  ...basePayload,
  reaction: string,        // Emoji (e.g., "thumbsup", "❤️")
  messageId: string        // EventId of message that got reaction
}
```

**LIMITATION:** No access to the original message content!

**Pattern - Reaction Voting System:**
```typescript
const polls = new Map() // messageId -> poll data

bot.onMessage(async (handler, event) => {
  if (event.message.startsWith("POLL:")) {
    const sent = await handler.sendMessage(event.channelId, event.message)
    polls.set(sent.eventId, {
      question: event.message,
      votes: { "thumbsup": 0, "thumbsdown": 0 }
    })
  }
})

bot.onReaction(async (handler, event) => {
  const poll = polls.get(event.messageId)
  if (poll && (event.reaction === "thumbsup" || event.reaction === "thumbsdown")) {
    poll.votes[event.reaction]++
    await handler.sendMessage(
      event.channelId,
      `Vote counted! thumbsup: ${poll.votes["thumbsup"]} thumbsdown: ${poll.votes["thumbsdown"]}`
    )
  }
})
```

### `onMessageEdit` - Edit Handler

**When it fires:** User edits their message

**Full Payload:**
```typescript
{
  ...basePayload,
  refEventId: string,      // ID of edited message
  message: string,         // New message content
  replyId?: string,        // If edited message was a reply
  threadId?: string,       // If edited message was in thread
  isMentioned: boolean,    // If bot mentioned in edit
  mentions: Array<{
    userId: string,
    displayName: string
  }>
}
```

**Use Case - Track Edit History:**
```typescript
const editHistory = new Map()

bot.onMessageEdit(async (handler, event) => {
  const history = editHistory.get(event.refEventId) || []
  history.push({
    content: event.message,
    editedAt: new Date(),
    editedBy: event.userId
  })
  editHistory.set(event.refEventId, history)
  
  if (event.isMentioned && !history.some(h => h.content.includes(bot.botId))) {
    // Bot was mentioned in edit but not original
    await handler.sendMessage(event.channelId, "I see you added me to your message!")
  }
})
```

### `onRedaction` / `onEventRevoke` - Deletion Handlers

**When it fires:** Message is deleted (by user or admin)

**Full Payload:**
```typescript
{
  ...basePayload,
  refEventId: string       // ID of deleted message
}
```

**Message Deletion Types:**

1. **User Deletion** - Users can delete their own messages using `removeEvent`
2. **Admin Redaction** - Admins with `Permission.Redact` can delete any message using `adminRemoveEvent`
3. **Bot Deletion** - Bots can delete their own messages using `removeEvent`

**Use Case - Cleanup Related Data:**
```typescript
bot.onRedaction(async (handler, event) => {
  // Clean up any stored data for this message
  messageCache.delete(event.refEventId)
  polls.delete(event.refEventId)
  editHistory.delete(event.refEventId)
  
  // Log who deleted what
  console.log(`Message ${event.refEventId} was deleted by ${event.userId}`)
})
```

**Implementing Message Deletion:**
```typescript
bot.onSlashCommand("delete", async (handler, event) => {
  if (!event.replyId) {
    await handler.sendMessage(event.channelId, "Reply to a message to delete it")
    return
  }
  
  // Check if user has redaction permission
  const canRedact = await handler.checkPermission(
    event.channelId,
    event.userId,
    Permission.Redact
  )
  
  if (canRedact) {
    // Admin can delete any message
    await handler.adminRemoveEvent(event.channelId, event.replyId)
    await handler.sendMessage(event.channelId, "Message deleted by admin")
  } else {
    // Regular users can only delete their own messages
    // Bot would need to track message ownership to verify
    await handler.sendMessage(event.channelId, "You can only delete your own messages")
  }
})
```

### `onTip` - Tip Handler

**When it fires:** User sends cryptocurrency tip on a message

**Full Payload:**
```typescript
{
  ...basePayload,
  messageId: string,       // Message that received tip
  senderAddress: string,   // Sender's address
  receiverAddress: string, // Receiver's address
  amount: bigint,         // Amount in wei
  currency: `0x${string}` // Token contract address
}
```

**Use Case - Thank Donors:**
```typescript
bot.onTip(async (handler, event) => {
  if (event.receiverAddress === bot.botId) {
    const ethAmount = Number(event.amount) / 1e18
    await handler.sendMessage(
      event.channelId,
      `Thank you for the ${ethAmount} ETH tip!`
    )
  }
})
```

### Sending Tips (`handler.tip`)

**IMPORTANT:** Bots can send cryptocurrency tips to users' messages using the `tip` method available in event handlers.

**Method Signature:**
```typescript
await handler.tip({
  account?: Account,        // Optional: Viem account. Defaults to bot's account
  to: Address,             // Recipient's address (0x...)
  amount: bigint,          // Amount in wei (use parseEther for ETH amounts)
  messageId: string,       // Event ID of the message to tip
  channelId: string,       // Channel where message was sent
  currency?: string        // Optional: Token address. Defaults to ETH
})

// Returns: Promise<{ txHash: string, eventId: string }>
```

**Real-World Example - Reward Bot:**
```typescript
import { parseEther } from 'viem'
import { ETH_ADDRESS } from '@towns-protocol/web3'

// Bot that tips helpful messages
bot.onMessage(async (handler, event) => {
  // Skip bot's own messages
  if (event.userId === bot.botId) return

  // Tip messages containing helpful keywords
  const helpfulKeywords = ['thanks', 'helpful', 'great answer', 'solved']
  const isHelpful = helpfulKeywords.some(keyword =>
    event.message.toLowerCase().includes(keyword)
  )

  if (isHelpful) {
    try {
      // Tip 0.001 ETH for helpful messages
      const { txHash, eventId } = await handler.sendTip({
        to: event.userId,              // Tip the message author
        amount: parseEther('0.001'),   // 0.001 ETH in wei
        messageId: event.eventId,       // The helpful message
        channelId: event.channelId,
        currency: ETH_ADDRESS,          // Optional, defaults to ETH
      })

      // Notify the user (optional)
      await handler.sendMessage(
        event.channelId,
        `Sent you a tip for being helpful! TX: ${txHash.slice(0, 10)}...`
      )
    } catch (error) {
      console.error('Failed to send tip:', error)
      // Optionally notify about the error
      await handler.sendMessage(
        event.channelId,
        'Sorry, failed to send tip. Please try again later.'
      )
    }
  }
})
```

**Advanced Example - Custom Account:**
```typescript
import { privateKeyToAccount } from 'viem/accounts'

// Use a different wallet for tipping (e.g., treasury wallet)
const treasuryAccount = privateKeyToAccount('0x...')

bot.onSlashCommand("reward", async (handler, event) => {
  // Requires replying to a message to reward it
  if (!event.replyId) {
    await handler.sendMessage(
      event.channelId,
      "Reply to a message to reward it with /reward [amount]"
    )
    return
  }

  // Parse amount from args (defaults to 0.01 ETH)
  const amountString = event.args[0] || '0.01'
  const amount = parseEther(amountString)

  try {
    // Get the original message author (would need to be stored)
    // In production, you'd look this up from your message cache
    const recipientAddress = '0x...' // Look up from storage

    const { txHash, eventId } = await handler.sendTip({
      account: treasuryAccount,      // Use treasury account
      to: recipientAddress,
      amount,
      messageId: event.replyId,
      channelId: event.channelId,
    })

    await handler.sendMessage(
      event.channelId,
      `Reward of ${amountString} ETH sent! Transaction: ${txHash}`
    )
  } catch (error) {
    await handler.sendMessage(
      event.channelId,
      `Failed to send reward: ${error.message}`
    )
  }
})
```

**Tracking Tips with Context:**
```typescript
// Store message context to enable tipping by message content
const messageCache = new Map()

bot.onMessage(async (handler, event) => {
  // Cache all messages with author info
  messageCache.set(event.eventId, {
    userId: event.userId,
    message: event.message,
    channelId: event.channelId,
  })

  // Bot admin commands: tip a specific message
  if (event.message.startsWith('!tip ')) {
    const match = event.message.match(/!tip (\S+) ([\d.]+)/)
    if (!match) {
      await handler.sendMessage(
        event.channelId,
        'Usage: !tip <messageId> <amount>'
      )
      return
    }

    const [, targetMessageId, amountStr] = match
    const targetMessage = messageCache.get(targetMessageId)

    if (!targetMessage) {
      await handler.sendMessage(event.channelId, 'Message not found')
      return
    }

    try {
      const { txHash } = await handler.tip({
        to: targetMessage.userId,
        amount: parseEther(amountStr),
        messageId: targetMessageId,
        channelId: targetMessage.channelId,
      })

      await handler.sendMessage(
        event.channelId,
        `Tipped ${amountStr} ETH to <@${targetMessage.userId}>! TX: ${txHash.slice(0, 10)}...`
      )
    } catch (error) {
      await handler.sendMessage(
        event.channelId,
        `Tip failed: ${error.message}`
      )
    }
  }
})
```

**Important Notes:**
- Bot must have sufficient funds in its account to send tips
- Requires valid recipient with membership token in the space
- All tips are on-chain transactions with gas fees
- Failed tips throw errors - always use try/catch
- Returns both transaction hash and stream event ID

### `onChannelJoin` / `onChannelLeave` - Membership Handlers

**When it fires:** User joins or leaves channel

**Payload:** Base payload only

**Use Case - Welcome Messages:**
```typescript
bot.onChannelJoin(async (handler, event) => {
  await handler.sendMessage(
    event.channelId,
    `Welcome <@${event.userId}> to the channel!`
  )
})
```

### `onStreamEvent` - Raw Event Handler

**When it fires:** ANY stream event (advanced use)

**Payload:**
```typescript
{
  ...basePayload,
  event: ParsedEvent      // Raw protocol buffer event
}
```

## Handler Combination Patterns

### Pattern 1: Contextual Responses

Store message context to enable rich interactions:

```typescript
const messageContext = new Map()

bot.onMessage(async (handler, event) => {
  // Store every message for context
  messageContext.set(event.eventId, {
    content: event.message,
    author: event.userId,
    timestamp: event.createdAt
  })
  
  // Reply with context
  if (event.replyId) {
    const original = messageContext.get(event.replyId)
    if (original?.content.includes("help")) {
      await handler.sendMessage(event.channelId, "I see you're replying to a help request!")
    }
  }
})

bot.onReaction(async (handler, event) => {
  const original = messageContext.get(event.messageId)
  if (original?.content.includes("vote") && event.reaction === "YES") {
    await handler.sendMessage(event.channelId, "Vote recorded!")
  }
})
```

### Pattern 2: Multi-Step Workflows

Track user state across events:

```typescript
const userWorkflows = new Map()

bot.onSlashCommand("setup", async (handler, event) => {
  userWorkflows.set(event.userId, { 
    step: "awaiting_name",
    channelId: event.channelId 
  })
  await handler.sendMessage(event.channelId, "What's your project name?")
})

bot.onMessage(async (handler, event) => {
  const workflow = userWorkflows.get(event.userId)
  if (!workflow) return
  
  switch(workflow.step) {
    case "awaiting_name":
      workflow.projectName = event.message
      workflow.step = "awaiting_description"
      await handler.sendMessage(event.channelId, "Describe your project:")
      break
      
    case "awaiting_description":
      workflow.description = event.message
      await handler.sendMessage(
        event.channelId,
        `Project "${workflow.projectName}" created!`
      )
      userWorkflows.delete(event.userId)
      break
  }
})
```

### Pattern 3: Thread Conversations

Maintain thread context:

```typescript
const threadContexts = new Map()

bot.onMessage(async (handler, event) => {
  if (event.threadId) {
    // In a thread
    let context = threadContexts.get(event.threadId)
    if (!context) {
      context = { messages: [], participants: new Set() }
      threadContexts.set(event.threadId, context)
    }
    
    context.messages.push({
      userId: event.userId,
      message: event.message,
      timestamp: event.createdAt
    })
    context.participants.add(event.userId)
    
    // Respond based on thread history
    if (context.messages.length === 5) {
      await handler.sendMessage(
        event.channelId,
        "This thread is getting long! Consider starting a new one.",
        { threadId: event.threadId }
      )
    }
  } else if (event.message.includes("?")) {
    // Start a help thread for questions
    const response = await handler.sendMessage(
      event.channelId,
      "Let me help with that!",
      { threadId: event.eventId }
    )
    
    threadContexts.set(event.eventId, {
      type: "help",
      originalQuestion: event.message,
      helper: bot.botId
    })
  }
})
```

## Bot Actions API Reference

All handlers receive a `handler` parameter with these methods:

### Message Operations

```typescript
// Send a message
await handler.sendMessage(
  channelId: string,
  message: string,
  opts?: {
    threadId?: string,      // Continue a thread
    replyId?: string,       // Reply to a message
    mentions?: Array<{      // Mention users
      userId: string,
      displayName: string
    }>,
    attachments?: Array<    // Add attachments (see Sending Attachments section)
      | { type: 'image', url: string, alt?: string }
    >
  }
)

// Edit a message (bot's own messages only)
await handler.editMessage(
  channelId: string,
  messageId: string,       // Your message's eventId
  newMessage: string
)

// Add reaction
await handler.sendReaction(
  channelId: string,
  messageId: string,       // Message to react to
  reaction: string         // Emoji
)
```

## Sending Attachments

The bot framework supports two types of attachments with automatic validation and encryption.

### Image Attachments from URLs

Send images by URL with automatic validation and dimension detection:

```typescript
bot.onSlashCommand("showcase", async (handler, event) => {
  await handler.sendMessage(event.channelId, "Product showcase:", {
    attachments: [{
      type: 'image',
      url: 'https://example.com/product.jpg',
      alt: 'Our flagship product in vibrant colors'
    }]
  })
})
```

### Multiple Attachments

Send multiple attachments of mixed types:

```typescript
// GIF Search Bot
bot.onSlashCommand("gif", async (handler, event) => {
  const query = event.args.join(" ")
  const gifUrls = await searchGifs(query)

  await handler.sendMessage(event.channelId, `Results for "${query}":`, {
    attachments: gifUrls.slice(0, 5).map(url => ({
      type: 'image',
      url,
      alt: `GIF result for ${query}`
    }))
  })
})
```

### Real-World Examples

**Weather Bot with Maps:**
```typescript
bot.onSlashCommand("weather", async (handler, event) => {
  const location = event.args.join(" ")
  const weatherData = await getWeatherData(location)

  await handler.sendMessage(
    event.channelId,
    `Weather in ${location}: ${weatherData.temp}°F, ${weatherData.conditions}`,
    {
      attachments: [{
        type: 'image',
        url: weatherData.radarMapUrl,
        alt: `Radar map for ${location}`
      }]
    }
  )
})
```

### Important Notes

- Invalid URLs (404, network errors) are gracefully skipped - message still sends
- URL images are fetched synchronously during `sendMessage`
- Multiple URL attachments are processed sequentially
```

### Message Deletion (Redaction)

**Two types of deletion:**

1. **`removeEvent`** - Delete bot's own messages
```typescript
// Bot deletes its own message
const sentMessage = await handler.sendMessage(channelId, "Oops, wrong channel!")
await handler.removeEvent(channelId, sentMessage.eventId)
```

2. **`adminRemoveEvent`** - Admin deletion (requires Permission.Redact)
```typescript
// Admin bot deletes any message
bot.onMessage(async (handler, event) => {
  if (event.message.includes("inappropriate content")) {
    // Check if bot has redaction permission
    const canRedact = await handler.checkPermission(
      event.channelId,
      bot.botId,  // Check bot's permission
      Permission.Redact
    )
    
    if (canRedact) {
      // Delete the inappropriate message
      await handler.adminRemoveEvent(event.channelId, event.eventId)
      await handler.sendMessage(event.channelId, "Message removed for violating guidelines")
    }
  }
})
```

**Important Notes:**
- `removeEvent` only works for messages sent by the bot itself
- `adminRemoveEvent` requires the bot to have `Permission.Redact` in the space
- Deleted messages trigger `onRedaction` event for all bots
- Users can always delete their own messages through the UI

### Permission System

**Towns uses blockchain-based permissions that control what users can do in spaces.**

#### Available Permissions
```typescript
Permission.Undefined         // No permission required
Permission.Read              // Read messages in channels
Permission.Write             // Send messages in channels
Permission.Invite            // Invite users to space
Permission.JoinSpace         // Join the space
Permission.Redact            // Delete any message (admin redaction)
Permission.ModifyBanning     // Ban/unban users (requires bot app to have this permission)
Permission.PinMessage        // Pin/unpin messages
Permission.AddRemoveChannels // Create/delete channels
Permission.ModifySpaceSettings // Change space configuration
Permission.React             // Add reactions to messages
```

#### Checking Permissions

**`hasAdminPermission(userId, spaceId)`** - Quick check for admin status
```typescript
// Check if user is a space admin (has ModifyBanning permission)
const isAdmin = await handler.hasAdminPermission(userId, spaceId)
if (isAdmin) {
  // User can ban, manage channels, modify settings
}
```

**`checkPermission(streamId, userId, permission)`** - Check specific permission
```typescript
// Import Permission enum from SDK
import { Permission } from '@towns-protocol/sdk'

// Check if user can delete messages
const canRedact = await handler.checkPermission(
  channelId,
  userId,
  Permission.Redact
)

// Check if user can send messages
const canWrite = await handler.checkPermission(
  channelId,
  userId,
  Permission.Write
)
```

#### Common Permission Patterns

**Admin-Only Commands:**
```typescript
bot.onSlashCommand("ban", async (handler, event) => {
  // Only admins can ban users
  if (!await handler.hasAdminPermission(event.userId, event.spaceId)) {
    await handler.sendMessage(event.channelId, "You don't have permission to ban users")
    return
  }
  
  const userToBan = event.mentions[0]?.userId || event.args[0]
  if (userToBan) {
    try {
      // Bot must have ModifyBanning permission for this to work
      const result = await handler.ban(userToBan, event.spaceId)
      await handler.sendMessage(event.channelId, `Successfully banned user ${userToBan}`)
    } catch (error) {
      await handler.sendMessage(event.channelId, `Failed to ban: ${error.message}`)
    }
  }
})

bot.onSlashCommand("unban", async (handler, event) => {
  if (!await handler.hasAdminPermission(event.userId, event.spaceId)) {
    await handler.sendMessage(event.channelId, "You don't have permission to unban users")
    return
  }
  
  const userToUnban = event.args[0]
  if (userToUnban) {
    try {
      // Bot must have ModifyBanning permission for this to work
      const result = await handler.unban(userToUnban, event.spaceId)
      await handler.sendMessage(event.channelId, `Successfully unbanned user ${userToUnban}`)
    } catch (error) {
      await handler.sendMessage(event.channelId, `Failed to unban: ${error.message}`)
    }
  }
})
```

**Permission-Based Features:**
```typescript
bot.onMessage(async (handler, event) => {
  if (event.message.startsWith("!delete")) {
    // Check if user can redact messages
    const canRedact = await handler.checkPermission(
      event.channelId,
      event.userId,
      Permission.Redact
    )
    
    if (!canRedact) {
      await handler.sendMessage(event.channelId, "You don't have permission to delete messages")
      return
    }
    
    // Delete the referenced message
    const messageId = event.replyId // Assuming they replied to the message to delete
    if (messageId) {
      await handler.adminRemoveEvent(event.channelId, messageId)
    }
  }
})
```

### Web3 Operations

```typescript
// Read from smart contract
const balance = await handler.readContract({
  address: "0x...",
  abi: [...],
  functionName: "balanceOf",
  args: [userAddress]
})

// Write to smart contract
const tx = await handler.writeContract({
  address: "0x...",
  abi: [...],
  functionName: "transfer",
  args: [recipient, amount]
})
```

### Snapshot Data Access

The bot provides type-safe access to stream snapshot data through `bot.snapshot`:

```typescript
// Get channel settings and inception data
const inception = await bot.snapshot.getChannelInception(channelId)
const settings = inception?.channelSettings

// Get user memberships
const memberships = await bot.snapshot.getUserMemberships(userId)

// Get space membership list
const members = await bot.snapshot.getSpaceMemberships(spaceId)
```
Note: Snapshot data may be outdated - it's a point-in-time view

## Storage Strategy Decision Matrix

| Hosting Type | Can Use In-Memory? | Recommended Storage | Why |
|-------------|-------------------|-------------------|-----|
| **Always-On VPS** | Yes | Map/Set, SQLite, PostgreSQL | Process persists between requests |
| **Dedicated Server** | Yes | Map/Set, SQLite, PostgreSQL | Full control over lifecycle |
| **Paid Cloud (Heroku/Render)** | Yes | Redis or PostgreSQL | Reliable uptime guarantees |
| **Serverless (Lambda)** | Not supported yet | Not supported yet | Bot framework doesn't support serverless |
| **Free Tier Hosting (Render)** | No | Turso (free plan) or SQLite (if file persists) | May sleep after inactivity |
| **Docker Container** | Yes* | Depends on orchestration | *If not auto-scaled |

### Storage Implementation Examples

#### In-Memory (Always-On Servers)
```typescript
// Simple and fast for reliable hosting
const messageCache = new Map<string, any>()
const userStates = new Map<string, any>()

bot.onMessage(async (handler, event) => {
  messageCache.set(event.eventId, event)
  // Cache persists between webhook calls
})
```

#### SQLite with Drizzle (Serverless/Unreliable)
```typescript
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core'

const messages = sqliteTable('messages', {
  eventId: text('event_id').primaryKey(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  timestamp: integer('timestamp').notNull(),
  threadId: text('thread_id'),
  replyId: text('reply_id')
})

const db = drizzle(new Database('bot.db'))

bot.onMessage(async (handler, event) => {
  // Persists across cold starts
  await db.insert(messages).values({
    eventId: event.eventId,
    userId: event.userId,
    content: event.message,
    timestamp: Date.now(),
    threadId: event.threadId,
    replyId: event.replyId
  })
})

bot.onReaction(async (handler, event) => {
  // Retrieve context from database
  const [original] = await db
    .select()
    .from(messages)
    .where(eq(messages.eventId, event.messageId))
})
```

#### Redis (High-Performance Persistent)
```typescript
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

bot.onMessage(async (handler, event) => {
  // Store with TTL
  await redis.setex(
    `msg:${event.eventId}`,
    3600, // 1 hour TTL
    JSON.stringify(event)
  )
  
  // Track user activity
  await redis.zadd(
    `user:${event.userId}:messages`,
    Date.now(),
    event.eventId
  )
})
```

## Advanced Bot Patterns

### Moderation Bot
```typescript
const warnings = new Map<string, number>()
const bannedWords = ['spam', 'scam']

bot.onMessage(async (handler, event) => {
  const hasViolation = bannedWords.some(word => 
    event.message.toLowerCase().includes(word)
  )
  
  if (hasViolation) {
    // Delete the message
    await handler.adminRemoveEvent(event.channelId, event.eventId)
    
    // Track warnings
    const count = (warnings.get(event.userId) || 0) + 1
    warnings.set(event.userId, count)
    
    // Send warning
    await handler.sendMessage(
      event.channelId,
      `WARNING: <@${event.userId}> Your message was removed. Warning ${count}/3`
    )
    
    // Ban after 3 warnings
    if (count >= 3) {
      // Implement ban logic via smart contract
      await handler.writeContract({...})
    }
  }
})
```

### Scheduled Message Bot
```typescript
const schedules = new Map()

bot.onSlashCommand("remind", async (handler, event) => {
  // /remind 5m Check the oven
  const [time, ...messageParts] = event.args
  const message = messageParts.join(" ")
  
  const minutes = parseInt(time)
  if (isNaN(minutes)) {
    await handler.sendMessage(event.channelId, "Usage: /remind <minutes> <message>")
    return
  }
  
  const scheduleId = setTimeout(async () => {
    await handler.sendMessage(
      event.channelId,
      `REMINDER: Reminder for <@${event.userId}>: ${message}`
    )
    schedules.delete(event.eventId)
  }, minutes * 60 * 1000)
  
  schedules.set(event.eventId, scheduleId)
  await handler.sendMessage(event.channelId, `YES Reminder set for ${minutes} minutes`)
})
```

### Analytics Bot
```typescript
const analytics = {
  messageCount: new Map(),
  activeUsers: new Set(),
  reactionCounts: new Map(),
  threadStarts: 0
}

bot.onMessage(async (handler, event) => {
  // Track metrics
  analytics.activeUsers.add(event.userId)
  analytics.messageCount.set(
    event.userId,
    (analytics.messageCount.get(event.userId) || 0) + 1
  )
  
  if (!event.threadId && !event.replyId) {
    // New conversation starter
    analytics.threadStarts++
  }
})

bot.onSlashCommand("stats", async (handler, event) => {
  const stats = `
 **Channel Stats**
• Active users: ${analytics.activeUsers.size}
• Total messages: ${Array.from(analytics.messageCount.values()).reduce((a,b) => a+b, 0)}
• Conversations started: ${analytics.threadStarts}
  `.trim()
  
  await handler.sendMessage(event.channelId, stats)
})
```

## Using Bot Methods Outside Handlers

**IMPORTANT:** Bot methods like `sendMessage()` can be called directly on the bot instance, outside of event handlers. This enables integration with external services, webhooks, and scheduled tasks.

### GitHub Integration Example

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { makeTownsBot } from '@towns-protocol/bot'

const app = new Hono()
const bot = await makeTownsBot(privateData, jwtSecret, { commands })

// Store which channel wants GitHub notifications
let githubChannelId: string | null = null

// 1. Setup command to register channel for GitHub notifications
bot.onSlashCommand("setup-github-here", async (handler, event) => {
  githubChannelId = event.channelId
  await handler.sendMessage(
    event.channelId,
    "GitHub notifications configured for this channel!"
  )
})

// 2. Towns webhook endpoint (required for bot to work)
const { jwtMiddleware, handler } = await bot.start()
app.post('/webhook', jwtMiddleware, handler)

// 3. GitHub webhook endpoint (separate from Towns webhook)
app.post('/github-webhook', async (c) => {
  const payload = await c.req.json()
  
  // Check if a channel is configured
  if (!githubChannelId) {
    return c.json({ error: "No channel configured" }, 400)
  }
  
  // Send GitHub event to the configured Towns channel
  // NOTE: Using bot.sendMessage() directly, outside any handler!
  if (payload.action === 'opened' && payload.pull_request) {
    await bot.sendMessage(
      githubChannelId,
      `PR opened: **${payload.pull_request.title}** by ${payload.sender.login}\n${payload.pull_request.html_url}`
    )
  } else if (payload.pusher) {
    const commits = payload.commits?.length || 0
    await bot.sendMessage(
      githubChannelId,
      `Push to ${payload.repository.name}: ${commits} commits by ${payload.pusher.name}`
    )
  }
  
  return c.json({ success: true })
})

serve({ fetch: app.fetch, port: 3000 })
```

### Health Check Monitoring Example

```typescript
const bot = await makeTownsBot(privateData, jwtSecret)

// Store health check configurations
const healthChecks = new Map<string, { 
  interval: NodeJS.Timeout,
  url: string,
  secondsBetween: number 
}>()

bot.onSlashCommand("setup-healthcheck", async (handler, event) => {
  const secondsBetween = parseInt(event.args[0]) || 60
  const url = event.args[1] || 'https://api.example.com/health'
  
  // Clear existing interval for this channel if any
  const existing = healthChecks.get(event.channelId)
  if (existing) {
    clearInterval(existing.interval)
  }
  
  // Setup new health check interval
  const interval = setInterval(async () => {
    try {
      const start = Date.now()
      const response = await fetch(url)
      const latency = Date.now() - start
      
      if (response.ok) {
        // Direct bot.sendMessage() call from timer
        await bot.sendMessage(
          event.channelId,
          `✅ Health Check OK: ${url} (${latency}ms)`
        )
      } else {
        await bot.sendMessage(
          event.channelId,
          `❌ Health Check Failed: ${url} - Status ${response.status}`
        )
      }
    } catch (error) {
      await bot.sendMessage(
        event.channelId,
        `❌ Health Check Error: ${url} - Service unreachable`
      )
    }
  }, secondsBetween * 1000)
  
  // Store the configuration
  healthChecks.set(event.channelId, { interval, url, secondsBetween })
  
  await handler.sendMessage(
    event.channelId,
    `Health check configured! Monitoring ${url} every ${secondsBetween} seconds`
  )
})

bot.onSlashCommand("stop-healthcheck", async (handler, event) => {
  const config = healthChecks.get(event.channelId)
  if (config) {
    clearInterval(config.interval)
    healthChecks.delete(event.channelId)
    await handler.sendMessage(event.channelId, "Health check monitoring stopped")
  } else {
    await handler.sendMessage(event.channelId, "No health check configured for this channel")
  }
})
```

### Key Patterns for External Integration

1. **Store Channel IDs**: Collect channel IDs from slash commands or messages
2. **External Triggers**: Use webhooks, timers, or API calls to trigger messages
3. **Direct Method Calls**: Call `bot.sendMessage()` directly, not through handlers
4. **Error Handling**: Always handle errors when sending unprompted messages
5. **Persistence**: Use a database for production storage of channel configurations

### Available Bot Methods Outside Handlers

```typescript
// All these methods work outside event handlers:
await bot.sendMessage(channelId, message, opts?)
await bot.editMessage(channelId, messageId, newMessage)
await bot.sendReaction(channelId, messageId, reaction)
await bot.removeEvent(channelId, eventId)
await bot.adminRemoveEvent(channelId, eventId)
await bot.hasAdminPermission(userId, spaceId)
await bot.checkPermission(channelId, userId, permission)
await bot.ban(userId, spaceId)  // Requires ModifyBanning permission
await bot.unban(userId, spaceId)  // Requires ModifyBanning permission
await bot.readContract({ ... })
await bot.writeContract({ ... })

// Access bot properties:
console.log(bot.botId)  // Bot's user ID (address)
```

**Important Notes:**
- You must have a valid `channelId` to send messages
- Store channel IDs from events (slash commands, messages, etc.)
- Handle cases where no channel is configured
- Consider rate limiting to avoid overwhelming channels
- Always wrap external calls in try-catch for error handling

## Troubleshooting Guide

### Issue: Bot doesn't respond to messages

**Checklist:**
1. YES Is `APP_PRIVATE_DATA` valid and base64 encoded?
2. YES Is `JWT_SECRET` correct?
3. YES Is the webhook URL accessible from internet?
4. YES Is the forwarding setting correct? (ALL_MESSAGES vs MENTIONS_REPLIES_REACTIONS)

### Issue: Lost context between events

**Solution:** In-memory storage only works if bot runs 24/7. Data is lost on restart.
```typescript
// WRONG - Will lose data on bot restart or crash
let counter = 0
bot.onMessage(() => counter++)

// CORRECT - Persists across restarts
const db = new Database()
bot.onMessage(() => db.increment('counter'))
```

### Issue: Slash commands not working

**Steps:**
1. Define in `src/commands.ts`
2. Pass to `makeTownsBot(data, secret, { commands })`
3. Sync: `npx towns-bot update-commands src/commands.ts <token>`
4. Register handler: `bot.onSlashCommand("name", handler)`

### Issue: Can't mention users

**Format:**
```typescript
// NO WRONG
await handler.sendMessage(channelId, "@username hello")

// YES CORRECT
await handler.sendMessage(channelId, "Hello <@0x1234...>", {
  mentions: [{
    userId: "0x1234...",
    displayName: "username"
  }]
})
```

## Environment Configuration

### Required Environment Variables
```bash
APP_PRIVATE_DATA=<base64_encoded_bot_credentials>
JWT_SECRET=<webhook_security_token>
PORT=3000  # Optional, defaults to 3000

# For persistent storage (optional)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Development Setup
```bash
# 1. Install dependencies
yarn install

# 2. Create .env file
cp .env.sample .env
# Edit .env with your credentials

# 3. Build and run
yarn build
yarn start

# 4. For development with hot reload
yarn dev
```


## Common Gotchas for AI Agents

1. **User IDs are addresses**: Always in format `0x...`, not usernames
2. **No DM/GDM support yet**: Not supported yet
3. **Slash commands are exclusive**: They never trigger `onMessage`
4. **Thread/Reply IDs only**: You never get the original message content
5. **Forwarding settings matter**: Bot may not receive all messages. Bot developer must set the forwarding setting correctly. `ALL_MESSAGES` or `MENTIONS_REPLIES_REACTIONS`
6. **Encryption is automatic**: Never handle encryption manually
7. **Multiple handlers allowed**: All registered handlers for an event will fire

## Quick Command Reference

```bash
# Development
yarn dev                # Start with hot reload
yarn build             # Build for production
yarn start             # Run production build
yarn test              # Run tests
yarn lint              # Check code quality
yarn typecheck         # Verify types

# Bot Management
npx towns-bot update-commands src/commands.ts <token>  # Sync slash commands
```

## Summary for AI Agents

To build a Towns bot:

1. **Understand limitations**: Stateless, no history, isolated events
2. **Choose storage strategy**: Based on your hosting environment
3. **Implement handlers**: Focus on single-event responses
4. **Handle context externally**: Use database/in-memory for state
5. **Deploy appropriately**: Match hosting to storage needs

Remember: The bot framework handles encryption, authentication, and routing. You focus on business logic within the constraints of stateless event processing.