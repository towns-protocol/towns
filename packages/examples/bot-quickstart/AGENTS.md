# AGENTS.md

This file provides guidance to AI agents for building Towns Protocol bots.

## Quick Start

**Requirements:**
1. **APP_PRIVATE_DATA** - Bot credentials
2. **JWT_SECRET** - Webhook security token
3. **Event handlers** - Functions responding to Towns events

**CRITICAL:** Stateless architecture - no message history, thread context, or conversation memory. Store context externally if needed.

## Base Payload

All events include:
```typescript
{
  userId: string      // Hex address (0x...)
  spaceId: string
  channelId: string
  eventId: string     // Unique event ID (use as threadId/replyId when responding)
  createdAt: Date
}
```

## Event Handlers

### onMessage
**When:** Any non-slash-command message

```typescript
{
  ...basePayload,
  message: string,
  replyId?: string,         // EventId of replied message
  threadId?: string,        // EventId of thread start
  isMentioned: boolean,
  mentions: Array<{ userId: string, displayName: string }>
}

bot.onMessage(async (handler, event) => {
  if (event.isMentioned) {
    await handler.sendMessage(event.channelId, "You mentioned me!")
  }
  if (event.threadId) {
    await handler.sendMessage(event.channelId, "Reply", { threadId: event.threadId })
  }
})
```

### onSlashCommand
**When:** User types `/command args` (does NOT trigger onMessage)

```typescript
{
  ...basePayload,
  command: string,
  args: string[],
  mentions: Array<{ userId: string, displayName: string }>,
  replyId?: string,
  threadId?: string
}
```

**Setup:**
```typescript
// 1. src/commands.ts
export const commands = [
  { name: "help", description: "Show help" }
] as const

// 2. Initialize
const bot = await makeTownsBot(privateData, jwtSecret, { commands })

// 3. Register
bot.onSlashCommand("help", async (handler, event) => {
  await handler.sendMessage(event.channelId, "Commands: /help")
})
```

#### Paid Commands
Add a `paid` property to your command definition with a price in USDC:
```typescript
{ name: "generate", description: "Generate AI content", paid: { price: '$0.20' } }
```

### onReaction
**When:** User adds emoji reaction

```typescript
{
  ...basePayload,
  reaction: string,        // "thumbsup", "❤️"
  messageId: string        // EventId
}
```
**Note:** No access to original message content.

### onTip
**When:** User sends cryptocurrency tip

```typescript
{
  ...basePayload,
  messageId: string,
  senderAddress: string,
  receiverAddress: string,
  amount: bigint,         // Wei
  currency: `0x${string}`
}

bot.onTip(async (handler, event) => {
  if (event.receiverAddress === bot.appAddress) {
    await handler.sendMessage(event.channelId, `Thanks for the tip!`)
  }
})
```

### onInteractionResponse
**When:** Button click, form submit, transaction/signature response
**Pattern:** Set ID in request → Match ID in response

```typescript
{ ...basePayload, response: DecryptedInteractionResponse }

// 1. Send request with ID
await handler.sendInteractionRequest(channelId, {
  case: "form", value: { id: "confirm-action", title: "Confirm?",
    components: [{ id: "yes", component: { case: "button", value: { label: "Yes" } } }] }
}, hexToBytes(userId as `0x${string}`))

// 2. Match ID in response
bot.onInteractionResponse(async (handler, event) => {
  if (event.response.payload.content?.case === "form") {
    const form = event.response.payload.content.value
    if (form.requestId === "confirm-action") {
      for (const c of form.components) {
        if (c.component.case === "button" && c.id === "yes") {
          await handler.sendMessage(event.channelId, "Confirmed!")
        }
      }
    }
  }
})
```

**Other Request Types:**
```typescript
import { hexToBytes } from 'viem'

// Transaction
await handler.sendInteractionRequest(channelId, {
  case: "transaction",
  value: { id: "tx-id", title: "Send USDC", content: { case: "evm",
    value: { chainId: "8453", to, value: "0", data, signerWallet: undefined } } }
})

// Signature
await handler.sendInteractionRequest(channelId, {
  case: "signature",
  value: { id: "sig-id", title: "Sign", chainId: "8453", data: JSON.stringify(typedData),
    type: InteractionRequestPayload_Signature_SignatureType.TYPED_DATA, signerWallet: undefined }
})
```

### Other Events

**onMessageEdit:** `{ ...basePayload, refEventId: string, message: string, ... }`

**onRedaction / onEventRevoke:** `{ ...basePayload, refEventId: string }`

**onChannelJoin / onChannelLeave:** Base payload only

**onStreamEvent:** `{ ...basePayload, event: ParsedEvent }` (advanced)

## Utility Functions

### Getting User's Wallet
```typescript
import { getSmartAccountFromUserId } from "@towns-protocol/bot"

const wallet = await getSmartAccountFromUserId(bot, { userId: event.userId })
const mentionWallet = await getSmartAccountFromUserId(bot, { userId: event.mentions[0].userId })
```

## Handler API

**Types:** `BotHandler`, `BasePayload`, `MessageOpts`

```typescript
// Send (ALWAYS use <@{userId}> in message AND add mentions in sendMessage options)
await handler.sendMessage(channelId, "Hello <@0x123...>", {
  threadId?, replyId?, mentions: [{ userId: "0x123...", displayName: "name" }], attachments? })

await handler.editMessage(channelId, messageId, newMessage)  // Bot's own only
await handler.sendReaction(channelId, messageId, reaction)
await handler.pinMessage(channelId, eventId, streamEvent)
await handler.unpinMessage(channelId, eventId)
await handler.createChannel(spaceId, { name, description?, autojoin?, hideUserJoinLeaveEvents? })  // Returns channelId
await handler.sendTip({ userId, amount, messageId, channelId, currency? })  // Requires gas in bot.botId, currency defaults to zeroAddress (ETH)
await handler.removeEvent(channelId, eventId)  // Bot's own
await handler.adminRemoveEvent(channelId, eventId)  // Any (needs Permission.Redact)
```

## Attachments

```typescript
// Image
attachments: [{ type: 'image', url: 'https://...jpg', alt: 'Desc' }]

// Link
attachments: [{ type: 'link', url: 'https://...' }]

// Miniapp
attachments: [{ type: 'miniapp', url: 'https://...' }]

// Chunked (videos, screenshots)
import { readFileSync } from 'node:fs'
attachments: [{
  type: 'chunked',
  data: readFileSync('./video.mp4'),  // Uint8Array
  filename: 'video.mp4',
  mimetype: 'video/mp4',  // Required
  width: 1920,            // Optional
  height: 1080
}]
```

## Permissions

```typescript
import { Permission } from '@towns-protocol/web3'
// Available: Read, Write, Redact, ModifyBanning, PinMessage, AddRemoveChannels, ModifySpaceSettings, React, Invite, JoinSpace

const isAdmin = await handler.hasAdminPermission(userId, spaceId)
const can = await handler.checkPermission(channelId, userId, Permission.Redact)

// Pattern
bot.onSlashCommand("ban", async (h, e) => {
  if (!await h.hasAdminPermission(e.userId, e.spaceId)) return await h.sendMessage(e.channelId, "No perm")
  await h.ban(e.mentions[0].userId, e.spaceId)
})
```

## Web3 / Contract Interactions

### Bot Wallet Architecture
**Two addresses:** Gas Wallet (`bot.botId` - Signs/EOA) | Bot Treasury (`bot.appAddress` - Executes & pays/Smart Account)
**CRITICAL:** Fund `bot.appAddress` for on-chain ops.

```typescript
bot.viem, bot.appAddress, bot.botId  // Access points

// Reading
import { readContract } from 'viem/actions'
const result = await readContract(bot.viem, { address, abi, functionName: 'balanceOf', args: [user] })
```

### Writing & execute()
```typescript
// SimpleAccount only
import { writeContract } from 'viem/actions'
import simpleAppAbi from '@towns-protocol/bot/simpleAppAbi'
const hash = await writeContract(bot.viem, { address: bot.appAddress, abi: simpleAppAbi,
  functionName: 'sendCurrency', args: [recipient, zeroAddress, parseEther('0.01')] })

// execute() - PRIMARY for external contracts
import { execute } from 'viem/experimental/erc7821'

// Single call
const hash = await execute(bot.viem, {
  address: bot.appAddress,
  account: bot.viem.account,
  calls: [{ to, abi, functionName: 'transfer', args: [...] }]
})

// Batch (atomic)
const hash = await execute(bot.viem, {
  address: bot.appAddress,
  account: bot.viem.account,
  calls: [
    { to: token, abi, functionName: 'approve', args: [...] },
    { to: dex, abi, functionName: 'swap', args: [...] }
  ]
})
```

**Use:** `readContract` (read) | `writeContract` (SimpleAccount) | `execute` (external)

## External Interactions (Unprompted Messages)

`bot.start()` returns a **Hono app**. To extend with additional routes, create a new Hono app and use `.route('/', app)` per https://hono.dev/docs/guides/best-practices#building-a-larger-application

**All handler methods available on bot** (webhooks, timers, tasks):
You need data prior (channelId, spaceId, etc):
```typescript
bot.sendMessage(channelId, msg, opts?) | bot.editMessage(...) | bot.sendReaction(...) | bot.removeEvent(...)
bot.adminRemoveEvent(...) | bot.pinMessage(...) | bot.unpinMessage(...) | bot.createChannel(...) | bot.sendTip(...)
bot.hasAdminPermission(...) | bot.checkPermission(...) | bot.ban(...) | bot.unban(...)
// Properties: bot.botId, bot.viem, bot.appAddress
```

**Patterns:** Store channel IDs | Webhooks/timers | Call bot.* directly | Handle errors

## Critical Notes

1. **User IDs are addresses** - `0x...`, not usernames
2. **Always use `<@{userId}>` for mentions AND add mentions in sendMessage options** - Not `@username`
3. **Slash commands exclusive** - Never trigger `onMessage`
5. **Stateless** - Store context externally
6. **Fund gas wallet for on-chain ops** - `bot.viem.account`
7. Use `getSmartAccountFromUserId` to get user's wallet address