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

**Handler Signature:**
```typescript
// Both ctx and event contain the same data - ctx has methods, event is just data
bot.onMessage(async (ctx, event) => {
  // ctx.channelId === event.channelId
  // ctx.userId === event.userId
  // etc.
})
```

**Common Patterns:**
```typescript
bot.onMessage(async (ctx, event) => {
  // Mentioned bot - use convenience method
  if (ctx.isMentioned) {
    await ctx.reply("You mentioned me!")  // Replies to this event
  }

  // Thread message - use ctx.send() for current channel
  if (ctx.threadId) {
    await ctx.send("Continuing thread...", { threadId: ctx.threadId })
  }

  // Reply to message
  if (ctx.replyId) {
    await ctx.send("I see you replied!")
  }

  // Mentioned in thread (combine flags)
  if (ctx.threadId && ctx.isMentioned) {
    await ctx.send("Mentioned in thread!", { threadId: ctx.threadId })
  }

  // You can also access event data from the 2nd parameter (backward compatible)
  await ctx.sendMessage(event.channelId, `Hello ${event.userId}!`)
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

3. Register handlers:
```typescript
bot.onSlashCommand("help", async (ctx, event) => {
  await ctx.send("Commands: /help, /poll")
})

bot.onSlashCommand("poll", async (ctx, event) => {
  const question = event.args.join(" ")
  if (!question) {
    await ctx.send("Usage: /poll <question>")
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

bot.onMessage(async (ctx, event) => {
  if (ctx.message.startsWith("POLL:")) {
    const sent = await ctx.send(ctx.message)
    polls.set(sent.eventId, {
      question: ctx.message,
      votes: { "thumbsup": 0, "thumbsdown": 0 }
    })
  }
})

bot.onReaction(async (ctx, event) => {
  const poll = polls.get(ctx.messageId)
  if (poll && (ctx.reaction === "thumbsup" || ctx.reaction === "thumbsdown")) {
    poll.votes[ctx.reaction]++
    await ctx.send(
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

bot.onMessageEdit(async (ctx, event) => {
  const history = editHistory.get(ctx.refEventId) || []
  history.push({
    content: ctx.message,
    editedAt: new Date(),
    editedBy: ctx.userId
  })
  editHistory.set(ctx.refEventId, history)

  if (ctx.isMentioned && !history.some(h => h.content.includes(bot.botId))) {
    // Bot was mentioned in edit but not original
    await ctx.send("I see you added me to your message!")
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
bot.onRedaction(async (ctx, event) => {
  // Clean up any stored data for this message
  messageCache.delete(ctx.refEventId)
  polls.delete(ctx.refEventId)
  editHistory.delete(ctx.refEventId)

  // Log who deleted what
  console.log(`Message ${ctx.refEventId} was deleted by ${ctx.userId}`)
})
```

**Implementing Message Deletion:**
```typescript
bot.onSlashCommand("delete", async (ctx, event) => {
  if (!ctx.replyId) {
    await ctx.send("Reply to a message to delete it")
    return
  }

  // Check if user has redaction permission
  const canRedact = await ctx.checkPermission(ctx.channelId, ctx.userId, Permission.Redact)

  if (canRedact) {
    // Admin can delete any message
    await ctx.adminRemoveEvent(ctx.channelId, ctx.replyId)
    await ctx.send("Message deleted by admin")
  } else {
    // Regular users can only delete their own messages
    // Bot would need to track message ownership to verify
    await ctx.send("You can only delete your own messages")
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
bot.onTip(async (ctx, event) => {
  if (ctx.receiverAddress === bot.botId) {
    const ethAmount = Number(ctx.amount) / 1e18
    await ctx.send(`Thank you for the ${ethAmount} ETH tip!`)
  }
})
```

### `onChannelJoin` / `onChannelLeave` - Membership Handlers

**When it fires:** User joins or leaves channel

**Payload:** Base payload only

**Use Case - Welcome Messages:**
```typescript
bot.onChannelJoin(async (ctx, event) => {
  await ctx.send(`Welcome <@${ctx.userId}> to the channel!`)
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

### `onInteractionResponse` - Interactive Button Handler

**When it fires:** User clicks a button or submits a form in an interactive message

**Full Payload:**
```typescript
{
  ...basePayload,
  response: DecryptedInteractionResponse  // Contains form/button data
}
```

**Interactive messages** allow you to create buttons, forms, and other UI elements that users can interact with. When a user clicks a button or submits a form, the `onInteractionResponse` handler is triggered.

### Sending Interactive Requests (Buttons, Forms, Transactions)

**⚠️ BREAKING CHANGE - SDK 408+:** The `sendInteractionRequest` API changed in SDK 408. Any SDK below 408 will not send interaction requests correctly.

**NEW FORMAT (SDK 408+):**
```typescript
import { hexToBytes } from 'viem'

// Send interactive form with buttons
await ctx.sendInteractionRequest(
  ctx.channelId,
  {
    case: "form",
    value: {
      id: "tier-selection-form",
      title: "Select Battle Tier",
      subtitle: "Choose which tier to stake your Degen in:",
      components: [
        {
          id: "tier-0",
          component: {
            case: "button",
            value: { label: "Low Tier - 1 $TOWNS" },
          },
        },
        {
          id: "tier-1",
          component: {
            case: "button",
            value: { label: "Medium Tier - 2 $TOWNS" },
          },
        },
        {
          id: "tier-2",
          component: {
            case: "button",
            value: { label: "Large Tier - 3 $TOWNS" },
          },
        },
      ],
    },
  },
  hexToBytes(userId as `0x${string}`)  // recipient is now the 3rd parameter
)
```

**OLD FORMAT (SDK < 408) - DO NOT USE:**
```typescript
// ❌ This format no longer works in SDK 408+
await ctx.sendInteractionRequest(channelId, {
  recipient: hexToBytes(userId as `0x${string}`),  // recipient was inside the object
  content: {
    case: "form",
    value: { /* ... */ }
  }
})
```

**Key Changes:**
- `recipient` parameter moved from inside the object to the 3rd parameter
- Interaction requests are now encrypted for security
- Update to SDK 408+ and adjust all `sendInteractionRequest` calls

**Use Case - Button Click Handling:**
```typescript
bot.onInteractionResponse(async (ctx, event) => {
  const { response } = ctx

  // Check if it's a form response (buttons are sent as forms)
  if (response.payload.content?.case !== "form") {
    return
  }

  const formResponse = response.payload.content?.value

  // Loop through all components to find which button was clicked
  for (const component of formResponse.components) {
    if (component.component.case === "button") {
      const componentId = component.id

      // Route to different handlers based on button ID
      if (componentId === "confirm-button") {
        await ctx.send("You confirmed the action!")
      } else if (componentId === "cancel-button") {
        await ctx.send("Action cancelled.")
      }
    }
  }
})
```

**Pattern - Game with Interactive Buttons:**
```typescript
import { hexToBytes } from 'viem'

// Store game state
const gameStates = new Map()

bot.onSlashCommand("play", async (ctx, event) => {
  // Initialize game state
  gameStates.set(ctx.userId, {
    score: 0,
    health: 100,
    channelId: ctx.channelId
  })

  // Send interactive buttons to the user
  await ctx.sendInteractionRequest(
    ctx.channelId,
    {
      case: "form",
      value: {
        id: "game-actions-form",
        title: "🎮 Your turn!",
        subtitle: "What do you do?",
        components: [
          {
            id: "attack-button",
            component: {
              case: "button",
              value: { label: "⚔️ Attack" },
            },
          },
          {
            id: "defend-button",
            component: {
              case: "button",
              value: { label: "🛡️ Defend" },
            },
          },
        ],
      },
    },
    hexToBytes(ctx.userId as `0x${string}`)
  )
})

bot.onInteractionResponse(async (ctx, event) => {
  const { response } = ctx

  if (response.payload.content?.case !== "form") {
    return
  }

  const formResponse = response.payload.content?.value
  const gameState = gameStates.get(ctx.userId)

  if (!gameState) {
    await ctx.send("No active game. Use /play to start!")
    return
  }

  // Handle button clicks
  for (const component of formResponse.components) {
    if (component.component.case === "button") {
      const buttonId = component.id

      if (buttonId === "attack-button") {
        gameState.score += 10
        await ctx.send(`⚔️ You attacked! Score: ${gameState.score}`)
      } else if (buttonId === "defend-button") {
        gameState.health += 5
        await ctx.send(`🛡️ You defended! Health: ${gameState.health}`)
      }

      gameStates.set(ctx.userId, gameState)
    }
  }
})
```

**Pattern - Re-using Command Handlers with Buttons:**
```typescript
// Define your command handlers as separate functions
async function handleHit(ctx: any) {
  const gameState = gameStates.get(ctx.userId)
  // ... hit logic
  await ctx.send("You hit!")
}

async function handleStand(ctx: any) {
  const gameState = gameStates.get(ctx.userId)
  // ... stand logic
  await ctx.send("You stand!")
}

// Register slash commands
bot.onSlashCommand("hit", handleHit)
bot.onSlashCommand("stand", handleStand)

// Handle button clicks by routing to the same handlers
bot.onInteractionResponse(async (ctx, event) => {
  const { response } = ctx

  if (response.payload.content?.case !== "form") {
    return
  }

  const formResponse = response.payload.content?.value

  for (const component of formResponse.components) {
    if (component.component.case === "button") {
      const componentId = component.id

      // Route button clicks to command handlers
      // ctx already contains userId, channelId, etc.
      if (componentId === "hit-button") {
        await handleHit(ctx)
      } else if (componentId === "stand-button") {
        await handleStand(ctx)
      }
    }
  }
})
```

**Important Notes:**
- Button IDs must be unique and match between your message creation and response handling
- Interactive messages enable rich user experiences (games, polls, confirmations, etc.)
- Store game/form state externally (database or in-memory) to maintain context
- Always validate that `response.payload.content?.case === "form"` before processing

### Sending Transaction Requests (EVM Transactions)

**Transaction requests** allow your bot to prompt users to sign and execute blockchain transactions. This is perfect for payments, NFT minting, token swaps, contract interactions, and more.

**Example 1: Basic Transaction Request (Any Wallet):**

This example shows a **real USDC ERC-20 transfer transaction** on Base mainnet. The user can sign with any wallet they control.

```typescript
import { InteractionRequestPayload_Signature_SignatureType } from "@towns-protocol/proto"

bot.onSlashCommand("send-usdc", async (ctx, event) => {
  // USDC Contract on Base (real contract address)
  const usdcContract = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  const recipient = "0x1234567890123456789012345678901234567890"
  const amount = "50000000" // 50 USDC (6 decimals)

  // Encode ERC20 transfer: transfer(address,uint256)
  const recipientPadded = recipient.slice(2).padStart(64, '0')
  const amountPadded = parseInt(amount).toString(16).padStart(64, '0')
  const data = `0xa9059cbb${recipientPadded}${amountPadded}`

  await ctx.sendInteractionRequest(ctx.channelId, {
    case: "transaction",
    value: {
      id: "usdc-transfer",
      title: "Send USDC",
      subtitle: "Send 50 USDC to recipient",
      content: {
        case: "evm",
        value: {
          chainId: "8453", // Base mainnet
          to: usdcContract,
          value: "0", // No ETH being sent
          data: data,
          signerWallet: undefined, // ⚠️ Allow ANY wallet (user chooses)
        },
      },
    },
  })
})
```

**Example 2: Transaction with Smart Account Restriction:**

This example restricts the transaction to **only the user's smart account wallet**. The user cannot choose a different wallet.

```typescript
bot.onSlashCommand("send-usdc-sm", async (ctx, event) => {
  // Get user's smart account address
  const smartAccount = await getSmartAccountFromUserId(bot, {
    userId: ctx.userId,
  })

  if (!smartAccount) {
    await ctx.send("Couldn't find smart account!")
    return
  }

  // Same USDC transfer, but restricted to smart account
  const usdcContract = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  const recipient = "0x1234567890123456789012345678901234567890"
  const amount = "50000000" // 50 USDC

  const recipientPadded = recipient.slice(2).padStart(64, '0')
  const amountPadded = parseInt(amount).toString(16).padStart(64, '0')
  const data = `0xa9059cbb${recipientPadded}${amountPadded}`

  await ctx.sendInteractionRequest(ctx.channelId, {
    case: "transaction",
    value: {
      id: "usdc-transfer-sm",
      title: "Send USDC",
      subtitle: "Send 50 USDC via smart account only",
      content: {
        case: "evm",
        value: {
          chainId: "8453",
          to: usdcContract,
          value: "0",
          data: data,
          signerWallet: smartAccount, // ✅ RESTRICTED to this specific wallet
        },
      },
    },
  })
})
```

**Example 3: Simple Contract Interaction (Lightweight Contract):**

For testing, you can deploy a lightweight contract with a simple function:

```solidity
// SimpleGreeting.sol - Deploy this for testing
contract SimpleGreeting {
    string public greeting = "Hello";
    
    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }
}
```

Then interact with it:

```typescript
bot.onSlashCommand("set-greeting", async (ctx, event) => {
  const newGreeting = ctx.args.join(" ") || "Hello Towns!"
  const contractAddress = "0xYourDeployedContractAddress"

  // Encode setGreeting(string) function call
  // Function selector: 0xa4136862
  const abiCoder = new ethers.utils.AbiCoder()
  const encodedParams = abiCoder.encode(["string"], [newGreeting]).slice(2)
  const data = `0xa4136862${encodedParams}`

  await ctx.sendInteractionRequest(ctx.channelId, {
    case: "transaction",
    value: {
      id: "set-greeting",
      title: "Update Greeting",
      subtitle: `Set greeting to: "${newGreeting}"`,
      content: {
        case: "evm",
        value: {
          chainId: "8453",
          to: contractAddress,
          value: "0",
          data: data,
          signerWallet: undefined, // Any wallet can call this
        },
      },
    },
  })
})
```

**Handling Transaction Responses:**
```typescript
bot.onInteractionResponse(async (ctx, event) => {
  if (ctx.response.payload.content?.case === "transaction") {
    const txData = ctx.response.payload.content.value

    await ctx.send(
      `✅ **Transaction Confirmed!**

Request ID: ${txData.requestId}
Transaction Hash: \`${txData.txHash}\`

View on explorer: https://basescan.org/tx/${txData.txHash}`
    )

    // You can now verify the transaction on-chain
    console.log("Transaction data:", txData)
  }
})
```

**Transaction Request Parameters:**
- `id`: Unique identifier for this transaction request
- `title`: Main heading shown to user
- `subtitle`: Descriptive text explaining the transaction
- `chainId`: EVM chain ID as string (e.g., "8453" for Base, "1" for Ethereum mainnet)
- `to`: Contract or wallet address receiving the transaction
- `value`: Amount of native token (ETH) to send in wei (as string)
- `data`: Encoded function call data (for contract interactions)
- `signerWallet`: (Optional) Specific wallet address that must sign, or undefined to allow any wallet

### Sending Signature Requests (EIP-712 Typed Data)

**Signature requests** allow your bot to request cryptographic signatures from users without executing transactions. Perfect for authentication, permissions, off-chain agreements, and gasless interactions.

**Example 1: Basic Signature Request (Any Wallet):**

This example allows the user to sign with **any wallet they control**. Useful for general authentication or agreements.

```typescript
import { InteractionRequestPayload_Signature_SignatureType } from "@towns-protocol/proto"

bot.onSlashCommand("sign-message", async (ctx, event) => {
  // EIP-712 Typed Data Structure
  const typedData = {
    domain: {
      name: "My Towns Bot",
      version: "1",
      chainId: 8453, // Base chain
      verifyingContract: "0x0000000000000000000000000000000000000000",
    },
    types: {
      // EIP712Domain is automatically included
      Message: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "content", type: "string" },
        { name: "timestamp", type: "uint256" },
      ],
    },
    primaryType: "Message",
    message: {
      from: ctx.userId,
      to: bot.botId,
      content: "I agree to the terms",
      timestamp: Math.floor(Date.now() / 1000),
    },
  }

  await ctx.sendInteractionRequest(ctx.channelId, {
    case: "signature",
    value: {
      id: "message-signature",
      title: "Sign Message",
      subtitle: `Sign: "${typedData.message.content}"`,
      chainId: "8453",
      data: JSON.stringify(typedData),
      type: InteractionRequestPayload_Signature_SignatureType.TYPED_DATA,
      signerWallet: undefined, // ⚠️ Allow ANY wallet (user chooses)
    },
  })
})
```

**Example 2: Signature Request with Smart Account Restriction:**

This example restricts the signature to **only the user's smart account wallet**. Useful when you need to verify the signature came from a specific account.

```typescript
bot.onSlashCommand("sign-message-sm", async (ctx, event) => {
  const smartAccount = await getSmartAccountFromUserId(bot, {
    userId: ctx.userId,
  })

  if (!smartAccount) {
    await ctx.send("Couldn't find smart account!")
    return
  }

  const typedData = {
    domain: {
      name: "My Towns Bot",
      version: "1",
      chainId: 8453,
      verifyingContract: "0x0000000000000000000000000000000000000000",
    },
    types: {
      Message: [
        { name: "from", type: "address" },
        { name: "content", type: "string" },
      ],
    },
    primaryType: "Message",
    message: {
      from: ctx.userId,
      content: "Smart account signature",
    },
  }

  await ctx.sendInteractionRequest(ctx.channelId, {
    case: "signature",
    value: {
      id: "message-signature-sm",
      title: "Sign Message",
      subtitle: "Sign with smart account only",
      chainId: "8453",
      data: JSON.stringify(typedData),
      type: InteractionRequestPayload_Signature_SignatureType.TYPED_DATA,
      signerWallet: smartAccount, // ✅ RESTRICTED to this specific wallet
    },
  })
})
```

**Handling Signature Responses:**
```typescript
bot.onInteractionResponse(async (ctx, event) => {
  if (ctx.response.payload.content?.case === "signature") {
    const signatureData = ctx.response.payload.content.value

    await ctx.send(
      `✅ **Signature Received!**

Request ID: ${signatureData.requestId}

**Signature:**
\`\`\`
${signatureData.signature}
\`\`\`

You can now verify this signature on-chain or use it for authentication.`
    )

    // Verify the signature if needed
    // const isValid = await verifyTypedData({
    //   address: ctx.userId,
    //   signature: signatureData.signature,
    //   ...typedData
    // })
  }
})
```

**Signature Request Parameters:**
- `id`: Unique identifier for this signature request
- `title`: Main heading shown to user
- `subtitle`: Descriptive text explaining what they're signing
- `chainId`: EVM chain ID as string
- `data`: JSON string of EIP-712 typed data structure
- `type`: Signature type (use `InteractionRequestPayload_Signature_SignatureType.TYPED_DATA`)
- `signerWallet`: (Optional) Specific wallet address that must sign, or undefined to allow any wallet

**Complete onInteractionResponse Handler (All Types):**
```typescript
bot.onInteractionResponse(async (ctx, event) => {
  const { response } = ctx

  switch (response.payload.content?.case) {
    case "signature":
      const signatureData = response.payload.content.value
      await ctx.send(
        `**Signature Received:**
Request ID: ${signatureData.requestId}

**Signature:**
\`\`\`
${signatureData.signature}
\`\`\`

**Raw Data:**
\`\`\`json
${JSON.stringify(signatureData, null, 2)}
\`\`\``
      )
      break

    case "transaction":
      const txData = response.payload.content.value
      await ctx.send(
        `**Transaction Received:**
Request ID: ${txData.requestId}

**Transaction Hash:**
\`${txData.txHash}\`

**Raw Data:**
\`\`\`json
${JSON.stringify(txData, null, 2)}
\`\`\``
      )
      break

    case "form":
      const formData = response.payload.content.value
      const extractedValues: Record<string, string> = {}

      // Extract form values
      for (const component of formData.components) {
        if (component.component.case === "textInput") {
          extractedValues[component.id] = component.component.value.value
        } else if (component.component.case === "button") {
          extractedValues[component.id] = "button_clicked"
        }
      }

      const formattedValues = Object.entries(extractedValues)
        .map(([key, value]) => `• ${key}: ${value}`)
        .join("\n")

      await ctx.send(
        `**Form Received:**
Request ID: ${formData.requestId}

**Values:**
${formattedValues}

**Raw Data:**
\`\`\`json
${JSON.stringify(extractedValues, null, 2)}
\`\`\``
      )
      break

    default:
      await ctx.send("Unknown interaction type")
      break
  }
})
```

**Use Cases for Interactive Requests:**

**Transaction Requests:**
- Request payments from users
- NFT minting flows
- Token swaps and DeFi interactions
- In-game purchases
- Crowdfunding contributions
- Contract deployments

**Signature Requests:**
- Authentication and login
- Agreement verification
- Ticket validation
- Achievement claims
- Gasless permissions
- Off-chain commitments

**Important Notes:**
- Transaction requests execute on-chain and require gas
- Signature requests are off-chain and free
- Both support restricting to specific wallets via `signerWallet` parameter
- EIP-712 typed data provides structured, human-readable signatures
- Always validate and verify responses in your handler
- Users can reject requests - handle gracefully

## Utility Functions

### Getting Smart Account Address from User ID

The bot SDK provides a utility to convert a user's Towns ID to their smart account (wallet) address:

```typescript
import { getSmartAccountFromUserId } from "@towns-protocol/bot"

bot.onMessage(async (ctx, event) => {
  // Get user's smart account (wallet) address
  // userId comes from bot.onMessage, onSlashCommand, onTip, or other event listeners
  const walletAddress = await getSmartAccountFromUserId(bot, { userId: ctx.userId })

  console.log(`User ${ctx.userId} has wallet address: ${walletAddress}`)

  // Use for Web3 operations
  await ctx.send(`Your wallet address is: ${walletAddress}`)
})
```

**Usage Examples:**

```typescript
// From slash command
bot.onSlashCommand("wallet", async (ctx, event) => {
  const walletAddress = await getSmartAccountFromUserId(bot, { userId: ctx.userId })
  await ctx.send(`Your wallet: ${walletAddress}`)
})

// From tip event
bot.onTip(async (ctx, event) => {
  const senderWallet = await getSmartAccountFromUserId(bot, { userId: ctx.userId })
  console.log(`Tip from wallet: ${senderWallet}`)
})

// For mentioned users
bot.onMessage(async (ctx, event) => {
  if (ctx.mentions.length > 0) {
    const firstMentionWallet = await getSmartAccountFromUserId(bot, {
      userId: ctx.mentions[0].userId
    })
    await ctx.send(`${ctx.mentions[0].displayName}'s wallet: ${firstMentionWallet}`)
  }
})
```

**Use Cases:**
- Send tokens/NFTs to a user's smart account
- Check user's on-chain balance or assets
- Execute contract calls on behalf of users
- Verify ownership of on-chain assets
- Airdrop rewards to community members

## Bot Wallet Architecture & Funding

**CRITICAL:** Towns Protocol bots use a dual-wallet architecture. Understanding this is essential for troubleshooting "insufficient funds" or "not enough gas" errors.

### The Two Addresses

Every bot has **TWO different blockchain addresses**:

#### 1. **Gas Wallet** - `bot.botId` / `bot.viem.account.address`
- **Type:** Externally Owned Account (EOA - regular wallet)
- **Role:** Signs transactions to authorize operations
- **Derived from:** Your `APP_PRIVATE_DATA` credentials
- **Funding:** ❌ **NOT required** - This wallet just signs, doesn't pay

#### 2. **Bot Treasury Wallet** - `bot.appAddress`
- **Type:** SimpleAccount smart contract (ERC-4337)
- **Role:** Executes transactions and pays for everything
- **Deployed on:** Blockchain when bot is created
- **Funding:** ✅ **REQUIRED** - This pays gas and holds bot's funds

### How It Works

```
User Action → Bot receives event
     ↓
Gas Wallet (EOA at bot.botId) SIGNS transaction
     ↓
Bot Treasury Wallet (Smart Account at bot.appAddress) EXECUTES & PAYS
     ↓
Transaction completes (gas paid from bot.appAddress balance)
```

### When You Need to Fund `bot.appAddress`

You **MUST** fund `bot.appAddress` if your bot:
- ✅ Sends tips or transfers tokens to users
- ✅ Executes any smart contract transactions
- ✅ Distributes prizes or payments
- ✅ Performs any on-chain write operations (using `execute()` or `writeContract()`)

You **DON'T** need funding for:
- ❌ Sending messages in Towns (free)
- ❌ Reading from smart contracts (no gas cost)
- ❌ Reacting to messages (free)
- ❌ Slash commands (free)

### How to Check and Fund Your Bot

**Check balances:**
```typescript
import { formatEther } from 'viem'

// Check Bot Treasury Wallet balance (CRITICAL - this needs funding!)
const appBalance = await bot.viem.getBalance({ 
  address: bot.appAddress 
})
console.log(`Bot Treasury Wallet: ${bot.appAddress}`)
console.log(`Balance: ${formatEther(appBalance)} ETH`)

// Check Gas Wallet balance (just for reference)
const gasWalletBalance = await bot.viem.getBalance({ 
  address: bot.viem.account.address 
})
console.log(`Gas Wallet: ${bot.viem.account.address}`)
console.log(`Balance: ${formatEther(gasWalletBalance)} ETH`)
```

**Fund your bot:**
Simply send ETH/tokens to `bot.appAddress` from any wallet (MetaMask, exchange, etc.)

**Example balance check command:**
```typescript
bot.onSlashCommand("balance", async (ctx, event) => {
  const appBalance = await bot.viem.getBalance({
    address: bot.appAddress
  })

  await ctx.send(
`💰 **Bot Balance**

Bot Treasury Wallet (pays for operations): ${formatEther(appBalance)} ETH
Address: \`${bot.appAddress}\`

${appBalance === 0n ? '⚠️ **CRITICAL:** Bot needs funding to execute transactions!' : '✅ Bot is funded and ready'}`)
})
```

### Common Errors and Solutions

#### Error: "insufficient funds for gas * price + value"
**Cause:** `bot.appAddress` doesn't have enough ETH to pay for gas
**Solution:** Send ETH to `bot.appAddress`

#### Error: "sender doesn't have enough funds to send tx"
**Cause:** `bot.appAddress` balance is too low for the transaction
**Solution:** Send more ETH to `bot.appAddress`

#### Error: "execution reverted" (when sending payments)
**Cause:** `bot.appAddress` doesn't have enough balance to send the payment amount + gas
**Solution:** Ensure `bot.appAddress` has enough ETH for both the payment and gas fees

### Checking Which Address Tips Go To

Tips can be received by either address. Check both in your tip handler:

```typescript
bot.onTip(async (ctx, event) => {
  console.log('Tip receiver:', event.receiverAddress)
  console.log('Bot ID:', bot.botId)
  console.log('App Address:', bot.appAddress)
  
  const isForBot = event.receiverAddress === bot.botId || 
                   event.receiverAddress === bot.appAddress
  
  if (isForBot) {
    // Handle tip...
  }
})
```

**Best Practice:** Check for both addresses since users might tip either one.

### Key Takeaways

1. **`bot.appAddress`** (Bot Treasury Wallet) = Where you send funds (the smart contract that executes transactions)
2. **`bot.botId`** (Gas Wallet) = Bot's identity (the EOA that signs transactions)
3. **All on-chain operations execute from and pay gas from `bot.appAddress`**
4. **Monitor `bot.appAddress` balance to avoid "insufficient funds" errors**
5. **Tips can go to either address - check both in your handlers**

## Handler Combination Patterns

### Pattern 1: Contextual Responses

Store message context to enable rich interactions:

```typescript
const messageContext = new Map()

bot.onMessage(async (ctx, event) => {
  // Store every message for context
  messageContext.set(ctx.eventId, {
    content: ctx.message,
    author: ctx.userId,
    timestamp: ctx.createdAt
  })

  // Reply with context
  if (ctx.replyId) {
    const original = messageContext.get(ctx.replyId)
    if (original?.content.includes("help")) {
      await ctx.send("I see you're replying to a help request!")
    }
  }
})

bot.onReaction(async (ctx, event) => {
  const original = messageContext.get(ctx.messageId)
  if (original?.content.includes("vote") && ctx.reaction === "YES") {
    await ctx.send("Vote recorded!")
  }
})
```

### Pattern 2: Multi-Step Workflows

Track user state across events:

```typescript
const userWorkflows = new Map()

bot.onSlashCommand("setup", async (ctx, event) => {
  userWorkflows.set(ctx.userId, {
    step: "awaiting_name",
    channelId: ctx.channelId
  })
  await ctx.send("What's your project name?")
})

bot.onMessage(async (ctx, event) => {
  const workflow = userWorkflows.get(ctx.userId)
  if (!workflow) return

  switch(workflow.step) {
    case "awaiting_name":
      workflow.projectName = ctx.message
      workflow.step = "awaiting_description"
      await ctx.send("Describe your project:")
      break

    case "awaiting_description":
      workflow.description = ctx.message
      await ctx.send(`Project "${workflow.projectName}" created!`)
      userWorkflows.delete(ctx.userId)
      break
  }
})
```

### Pattern 3: Thread Conversations

Maintain thread context:

```typescript
const threadContexts = new Map()

bot.onMessage(async (ctx, event) => {
  if (ctx.threadId) {
    // In a thread
    let context = threadContexts.get(ctx.threadId)
    if (!context) {
      context = { messages: [], participants: new Set() }
      threadContexts.set(ctx.threadId, context)
    }

    context.messages.push({
      userId: ctx.userId,
      message: ctx.message,
      timestamp: ctx.createdAt
    })
    context.participants.add(ctx.userId)

    // Respond based on thread history
    if (context.messages.length === 5) {
      await ctx.send(
        "This thread is getting long! Consider starting a new one.",
        { threadId: ctx.threadId }
      )
    }
  } else if (ctx.message.includes("?")) {
    // Start a help thread for questions
    const response = await ctx.send(
      "Let me help with that!",
      { threadId: ctx.eventId }
    )

    threadContexts.set(ctx.eventId, {
      type: "help",
      originalQuestion: ctx.message,
      helper: bot.botId
    })
  }
})
```

## Bot Actions API Reference

All handlers receive a `ctx` parameter with these methods:

### Exported Types for Building Abstractions

The `@towns-protocol/bot` package exports several types useful for building abstractions:

**`BotHandler`** - Type representing all methods available on the `ctx` parameter. Use this when building helper functions, middleware, or utilities that need to accept a context as a parameter.

**`BasePayload`** - Type containing common fields present in all event payloads (`userId`, `spaceId`, `channelId`, `eventId`, `createdAt`). Use this when building generic event processing utilities that work across different event types.

**`MessageOpts`** - Type defining options for sending messages (threadId, replyId, mentions, attachments, ephemeral). Use this when building message utilities that need to accept or manipulate message sending options.

### Message Operations

```typescript
// Convenience methods (use ctx.channelId automatically)
await ctx.send(message: string, opts?)      // Send to current channel
await ctx.reply(message: string, opts?)     // Reply to current event
await ctx.react(reaction: string)           // React to current event

// Full methods (when you need a different streamId)
await ctx.sendMessage(
  streamId: string,
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
await ctx.editMessage(
  streamId: string,
  messageId: string,       // Your message's eventId
  newMessage: string
)

// Add reaction
await ctx.sendReaction(
  streamId: string,
  messageId: string,       // Message to react to
  reaction: string         // Emoji
)
```

## Sending Attachments

The bot framework supports two types of attachments with automatic validation and encryption.

### Image Attachments from URLs

Send images by URL with automatic validation and dimension detection:

```typescript
bot.onSlashCommand("showcase", async (ctx, event) => {
  await ctx.send("Product showcase:", {
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
bot.onSlashCommand("gif", async (ctx, event) => {
  const query = ctx.args.join(" ")
  const gifUrls = await searchGifs(query)

  await ctx.send(`Results for "${query}":`, {
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
bot.onSlashCommand("weather", async (ctx, event) => {
  const location = ctx.args.join(" ")
  const weatherData = await getWeatherData(location)

  await ctx.send(
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

### Chunked Media Attachments (Binary Data)

Send raw binary data (videos, screenshots, generated images) using `type: 'chunked'`. The framework handles encryption, chunking (1.2MB per chunk), and retries automatically.

**Video File Example:**
```typescript
import { readFileSync } from 'node:fs'

bot.onSlashCommand("rickroll", async (ctx, event) => {
  // Load video file as binary data
  const videoData = readFileSync('./rickroll.mp4')

  await ctx.send("Never gonna give you up!", {
    attachments: [{
      type: 'chunked',
      data: videoData,           // Uint8Array
      filename: 'rickroll.mp4',
      mimetype: 'video/mp4',     // Required for Uint8Array
      width: 1920,               // Optional (not auto-detected for videos)
      height: 1080               // Optional (not auto-detected for videos)
    }]
  })
})
```

**Screenshot Example (Canvas):**
```typescript
import { createCanvas } from '@napi-rs/canvas'

bot.onSlashCommand("chart", async (ctx, event) => {
  const value = parseInt(ctx.args[0]) || 50

  // Generate chart image
  const canvas = createCanvas(400, 300)
  const canvasCtx = canvas.getContext('2d')

  canvasCtx.fillStyle = '#2c3e50'
  canvasCtx.fillRect(0, 0, 400, 300)
  canvasCtx.fillStyle = '#3498db'
  canvasCtx.fillRect(50, 300 - value * 2, 300, value * 2)
  canvasCtx.fillStyle = '#fff'
  canvasCtx.font = '24px sans-serif'
  canvasCtx.fillText(`Value: ${value}`, 150, 50)

  // Export as PNG Blob
  const blob = await canvas.encode('png')

  await ctx.send("Your chart:", {
    attachments: [{
      type: 'chunked',
      data: blob,                // Blob (no mimetype needed)
      filename: 'chart.png',
      width: 400,                // Optional (auto-detected for images)
      height: 300                // Optional (auto-detected for images)
    }]
  })
})
```

**Screenshot Example (Raw PNG Data):**
```typescript
bot.onSlashCommand("screenshot", async (ctx, event) => {
  // Capture screen using your preferred library
  const screenshotBuffer = await captureScreen()

  await ctx.send("Current screen:", {
    attachments: [{
      type: 'chunked',
      data: screenshotBuffer,    // Uint8Array or Buffer
      filename: 'screenshot.png',
      mimetype: 'image/png'      // Required for Uint8Array
      // width/height auto-detected for image/* mimetypes
    }]
  })
})
```

**Mixed Attachments Example:**
```typescript
// Combine URL images with chunked media
await ctx.send("Product comparison:", {
  attachments: [
    {
      type: 'image',
      url: 'https://example.com/product-a.jpg',
      alt: 'Product A'
    },
    {
      type: 'chunked',
      data: generatedComparisonChart,  // Binary data
      filename: 'comparison.png',
      mimetype: 'image/png'
    }
  ]
})
```

**Important Notes:**
- **Uint8Array requires `mimetype`**: Must specify `mimetype` when using Uint8Array data
- **Blob mimetype is automatic**: Blob objects already contain mimetype information
- **Image dimensions auto-detected**: For image mimetypes (`image/*`), dimensions are detected automatically
- **Video/other dimensions manual**: For videos and other media, specify `width`/`height` manually if needed
```

### Message Deletion (Redaction)

**Two types of deletion:**

1. **`removeEvent`** - Delete bot's own messages
```typescript
// Bot deletes its own message
const sentMessage = await ctx.send("Oops, wrong channel!")
await ctx.removeEvent(ctx.channelId, sentMessage.eventId)
```

2. **`adminRemoveEvent`** - Admin deletion (requires Permission.Redact)
```typescript
// Admin bot deletes any message
bot.onMessage(async (ctx, event) => {
  if (ctx.message.includes("inappropriate content")) {
    // Check if bot has redaction permission
    const canRedact = await ctx.checkPermission(
      ctx.channelId,
      bot.botId,  // Check bot's permission
      Permission.Redact
    )

    if (canRedact) {
      // Delete the inappropriate message
      await ctx.adminRemoveEvent(ctx.channelId, ctx.eventId)
      await ctx.send("Message removed for violating guidelines")
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
const isAdmin = await ctx.hasAdminPermission(userId, spaceId)
if (isAdmin) {
  // User can ban, manage channels, modify settings
}
```

**`checkPermission(streamId, userId, permission)`** - Check specific permission
```typescript
// Import Permission enum from SDK
import { Permission } from '@towns-protocol/web3'

// Check if user can delete messages
const canRedact = await ctx.checkPermission(
  ctx.channelId,
  ctx.userId,
  Permission.Redact
)

// Check if user can send messages
const canWrite = await ctx.checkPermission(
  ctx.channelId,
  ctx.userId,
  Permission.Write
)
```

#### Common Permission Patterns

**Admin-Only Commands:**
```typescript
bot.onSlashCommand("ban", async (ctx, event) => {
  // Only admins can ban users
  if (!await ctx.hasAdminPermission(ctx.userId, ctx.spaceId)) {
    await ctx.send("You don't have permission to ban users")
    return
  }

  const userToBan = ctx.mentions[0]?.userId || ctx.args[0]
  if (userToBan) {
    try {
      // Bot must have ModifyBanning permission for this to work
      const result = await ctx.ban(userToBan, ctx.spaceId)
      await ctx.send(`Successfully banned user ${userToBan}`)
    } catch (error) {
      await ctx.send(`Failed to ban: ${error.message}`)
    }
  }
})

bot.onSlashCommand("unban", async (ctx, event) => {
  if (!await ctx.hasAdminPermission(ctx.userId, ctx.spaceId)) {
    await ctx.send("You don't have permission to unban users")
    return
  }

  const userToUnban = ctx.args[0]
  if (userToUnban) {
    try {
      // Bot must have ModifyBanning permission for this to work
      const result = await ctx.unban(userToUnban, ctx.spaceId)
      await ctx.send(`Successfully unbanned user ${userToUnban}`)
    } catch (error) {
      await ctx.send(`Failed to unban: ${error.message}`)
    }
  }
})
```

**Permission-Based Features:**
```typescript
bot.onMessage(async (ctx, event) => {
  if (ctx.message.startsWith("!delete")) {
    // Check if user can redact messages
    const canRedact = await ctx.checkPermission(
      ctx.channelId,
      ctx.userId,
      Permission.Redact
    )

    if (!canRedact) {
      await ctx.send("You don't have permission to delete messages")
      return
    }

    // Delete the referenced message
    const messageId = ctx.replyId // Assuming they replied to the message to delete
    if (messageId) {
      await ctx.adminRemoveEvent(ctx.channelId, messageId)
    }
  }
})
```

### Web3 Operations

Context exposes viem client and app address for direct Web3 interactions:

```typescript
ctx.viem        // Viem client with Account for contract interactions
ctx.appAddress   // Bot's app contract address (SimpleAccount)
```

**Reading from Contracts:**

Use `readContract` for reading from any contract:

```typescript
import { readContract } from 'viem/actions'
import simpleAppAbi from '@towns-protocol/bot/simpleAppAbi'

// Read from any contract
const owner = await readContract(ctx.viem, {
  address: ctx.appAddress,
  abi: simpleAppAbi,
  functionName: 'moduleOwner',
  args: []
})
```

**Writing to Bot's Own Contract:**

Use `writeContract` ONLY for the bot's SimpleAccount contract operations:

```typescript
import { writeContract, waitForTransactionReceipt } from 'viem/actions'
import simpleAppAbi from '@towns-protocol/bot/simpleAppAbi'
import { parseEther, zeroAddress } from 'viem'

// Only for SimpleAccount contract operations
const hash = await writeContract(ctx.viem, {
  address: ctx.appAddress,
  abi: simpleAppAbi,
  functionName: 'sendCurrency',
  args: [recipientAddress, zeroAddress, parseEther('0.01')]
})

await waitForTransactionReceipt(ctx.viem, { hash })
```

**Interacting with ANY Contract (PRIMARY METHOD):**

Use `execute` from ERC-7821 for any onchain interaction. This is your main tool for blockchain operations - tipping, swapping, staking, NFTs, DeFi, anything!

```typescript
import { execute } from 'viem/experimental/erc7821'
import { parseEther } from 'viem'

// Single operation: tip a user on Towns
bot.onSlashCommand("tip", async (ctx, event) => {
  if (ctx.mentions.length === 0 || !ctx.args[0]) {
    await ctx.send("Usage: /tip @user <amount>")
    return
  }

  const recipient = ctx.mentions[0].userId
  const amount = parseEther(ctx.args[0])

  const hash = await execute(ctx.viem, {
    address: ctx.appAddress,
    account: ctx.viem.account,
    calls: [{
      to: tippingContractAddress,
      abi: tippingAbi,
      functionName: 'tip',
      value: amount,
      args: [{
        receiver: recipient,
        tokenId: tokenId,
        currency: ETH_ADDRESS,
        amount: amount,
        messageId: messageId,
        channelId: ctx.channelId
      }]
    }]
  })

  await waitForTransactionReceipt(ctx.viem, { hash })

  await ctx.send(`Tipped ${ctx.args[0]} ETH to ${recipient}! Tx: ${hash}`)
})
```

**Batch Operations:**

Execute multiple onchain interactions in a single atomic transaction:

```typescript
import { execute } from 'viem/experimental/erc7821'
import { parseEther } from 'viem'

// Airdrop tips to multiple users in one transaction
bot.onSlashCommand("airdrop", async (ctx, event) => {
  if (ctx.mentions.length === 0 || !ctx.args[0]) {
    await ctx.send("Usage: /airdrop @user1 @user2 ... <amount-each>")
    return
  }

  const amountEach = parseEther(ctx.args[0])

  // Build batch calls - one tip per user
  const calls = ctx.mentions.map(mention => ({
    to: tippingContractAddress,
    abi: tippingAbi,
    functionName: 'tip',
    value: amountEach,
    args: [{
      receiver: mention.userId,
      tokenId: tokenId,
      currency: ETH_ADDRESS,
      amount: amountEach,
      messageId: messageId,
      channelId: ctx.channelId
    }]
  }))

  const hash = await execute(ctx.viem, {
    address: ctx.appAddress,
    account: ctx.viem.account,
    calls
  })

  await waitForTransactionReceipt(ctx.viem, { hash })

  await ctx.send(`Airdropped ${ctx.args[0]} ETH to ${ctx.mentions.length} users! Tx: ${hash}`)
})
```

**Complex Multi-Step Operations:**

Combine different contract interactions (approve + swap + stake, etc.):

```typescript
import { execute } from 'viem/experimental/erc7821'
import { parseEther } from 'viem'

// Approve, swap, and stake in one atomic transaction
bot.onSlashCommand("defi", async (ctx, event) => {
  const amount = parseEther(ctx.args[0] || '100')

  const hash = await execute(ctx.viem, {
    address: ctx.appAddress,
    account: ctx.viem.account,
    calls: [
      {
        to: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [dexAddress, amount]
      },
      {
        to: dexAddress,
        abi: dexAbi,
        functionName: 'swapExactTokensForTokens',
        args: [amount, minOut, [tokenIn, tokenOut], ctx.appAddress]
      },
      {
        to: stakingAddress,
        abi: stakingAbi,
        functionName: 'stake',
        args: [amount]
      }
    ]
  })

  await waitForTransactionReceipt(ctx.viem, { hash })

  await ctx.send(`Swapped and staked ${ctx.args[0]} tokens! Tx: ${hash}`)
})
```

**Advanced: Batch of Batches:**

Use `executeBatch` for executing multiple batches (advanced use case):

```typescript
import { executeBatch } from 'viem/experimental/erc7821'

// Execute batches of batches
const hash = await executeBatch(ctx.viem, {
  address: ctx.appAddress,
  account: ctx.viem.account,
  calls: [
    [/* first batch */],
    [/* second batch */],
    [/* third batch */]
  ]
})
```

**When to Use Each:**

- **`readContract`**: Reading from any contract (no transaction needed)
- **`writeContract`**: ONLY for bot's own SimpleAccount contract operations
- **`execute`**: PRIMARY METHOD for any onchain interaction
  - Tipping, swapping, staking, NFT minting, etc.
  - Works for single operations OR batch operations
  - Atomic execution (all succeed or all fail)
  - Gas optimized when batching multiple operations
  - This is how you interact with external contracts
- **`executeBatch`**: Advanced batching (batches of batches)

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

bot.onMessage(async (ctx, event) => {
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

bot.onMessage(async (ctx, event) => {
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

bot.onReaction(async (ctx, event) => {
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

bot.onMessage(async (ctx, event) => {
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

bot.onMessage(async (ctx, event) => {
  const hasViolation = bannedWords.some(word =>
    ctx.message.toLowerCase().includes(word)
  )

  if (hasViolation) {
    // Delete the message
    await ctx.adminRemoveEvent(ctx.channelId, ctx.eventId)

    // Track warnings
    const count = (warnings.get(ctx.userId) || 0) + 1
    warnings.set(ctx.userId, count)

    // Send warning
    await ctx.send(`WARNING: <@${ctx.userId}> Your message was removed. Warning ${count}/3`)

    // Ban after 3 warnings
    if (count >= 3) {
      // Ban the user (requires ModifyBanning permission)
      await ctx.ban(ctx.userId, ctx.spaceId)
      await ctx.send(`<@${ctx.userId}> has been banned after 3 warnings`)
    }
  }
})
```

### Scheduled Message Bot
```typescript
const schedules = new Map()

bot.onSlashCommand("remind", async (ctx, event) => {
  // /remind 5m Check the oven
  const [time, ...messageParts] = ctx.args
  const message = messageParts.join(" ")

  const minutes = parseInt(time)
  if (isNaN(minutes)) {
    await ctx.send("Usage: /remind <minutes> <message>")
    return
  }

  // Note: For delayed messages, we use bot.sendMessage (not ctx.send)
  // because the context is only valid during the handler execution
  const channelId = ctx.channelId
  const userId = ctx.userId
  const eventId = ctx.eventId

  const scheduleId = setTimeout(async () => {
    await bot.sendMessage(channelId, `REMINDER: Reminder for <@${userId}>: ${message}`)
    schedules.delete(eventId)
  }, minutes * 60 * 1000)

  schedules.set(eventId, scheduleId)
  await ctx.send(`YES Reminder set for ${minutes} minutes`)
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

bot.onMessage(async (ctx, event) => {
  // Track metrics
  analytics.activeUsers.add(ctx.userId)
  analytics.messageCount.set(
    ctx.userId,
    (analytics.messageCount.get(ctx.userId) || 0) + 1
  )

  if (!ctx.threadId && !ctx.replyId) {
    // New conversation starter
    analytics.threadStarts++
  }
})

bot.onSlashCommand("stats", async (ctx, event) => {
  const stats = `
 **Channel Stats**
• Active users: ${analytics.activeUsers.size}
• Total messages: ${Array.from(analytics.messageCount.values()).reduce((a,b) => a+b, 0)}
• Conversations started: ${analytics.threadStarts}
  `.trim()

  await ctx.send(stats)
})
```

## Using Bot Methods Outside Handlers

**IMPORTANT:** Bot methods like `sendMessage()` can be called directly on the bot instance, outside of event handlers. This enables integration with external services, webhooks, and scheduled tasks.

### GitHub Integration Example

```typescript
import { Hono } from 'hono'
import { makeTownsBot } from '@towns-protocol/bot'

const app = new Hono()
const bot = await makeTownsBot(privateData, jwtSecret, { commands })

// Store which channel wants GitHub notifications
let githubChannelId: string | null = null

// 1. Setup command to register channel for GitHub notifications
bot.onSlashCommand("setup-github-here", async (ctx, event) => {
  githubChannelId = ctx.channelId
  await ctx.send("GitHub notifications configured for this channel!")
})

// 2. Towns webhook endpoint (required for bot to work)
const { jwtMiddleware, handler } = bot.start()
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
export default app
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

bot.onSlashCommand("setup-healthcheck", async (ctx, event) => {
  const secondsBetween = parseInt(ctx.args[0]) || 60
  const url = ctx.args[1] || 'https://api.example.com/health'

  // Clear existing interval for this channel if any
  const existing = healthChecks.get(ctx.channelId)
  if (existing) {
    clearInterval(existing.interval)
  }

  // Capture channelId for use in setTimeout (ctx is only valid during handler)
  const channelId = ctx.channelId

  // Setup new health check interval
  const interval = setInterval(async () => {
    try {
      const start = Date.now()
      const response = await fetch(url)
      const latency = Date.now() - start

      if (response.ok) {
        // Direct bot.sendMessage() call from timer
        await bot.sendMessage(channelId, `✅ Health Check OK: ${url} (${latency}ms)`)
      } else {
        await bot.sendMessage(channelId, `❌ Health Check Failed: ${url} - Status ${response.status}`)
      }
    } catch (error) {
      await bot.sendMessage(channelId, `❌ Health Check Error: ${url} - Service unreachable`)
    }
  }, secondsBetween * 1000)

  // Store the configuration
  healthChecks.set(channelId, { interval, url, secondsBetween })

  await ctx.send(`Health check configured! Monitoring ${url} every ${secondsBetween} seconds`)
})

bot.onSlashCommand("stop-healthcheck", async (ctx, event) => {
  const config = healthChecks.get(ctx.channelId)
  if (config) {
    clearInterval(config.interval)
    healthChecks.delete(ctx.channelId)
    await ctx.send("Health check monitoring stopped")
  } else {
    await ctx.send("No health check configured for this channel")
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

// Access bot properties:
bot.botId      // Bot's user ID (address)
bot.viem       // Viem client with Account for Web3 operations
bot.appAddress // Bot's app contract address (SimpleAccount)

// For Web3 operations:
import { readContract, writeContract } from 'viem/actions'
import { execute } from 'viem/experimental/erc7821'

// Read from any contract
await readContract(bot.viem, { address, abi, functionName, args })

// Write to bot's own SimpleAccount contract ONLY
await writeContract(bot.viem, { address: bot.appAddress, abi: simpleAppAbi, functionName, args })

// Execute any onchain interaction (PRIMARY METHOD for external contracts)
await execute(bot.viem, {
  address: bot.appAddress,
  account: bot.viem.account,
  calls: [{ to, abi, functionName, args, value }]
})
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

### Issue: Transaction fails with "insufficient funds" or "not enough gas"

**Common Errors:**
- `insufficient funds for gas * price + value`
- `sender doesn't have enough funds to send tx`
- `execution reverted` (when sending payments)

**Solution:** Your bot's **App Contract** (`bot.appAddress`) needs ETH funding!

**Quick Fix:**
1. Check which address needs funding:
```typescript
console.log('Fund this address:', bot.appAddress)
const balance = await bot.viem.getBalance({ address: bot.appAddress })
console.log('Current balance:', formatEther(balance), 'ETH')
```

2. Send ETH to `bot.appAddress` from MetaMask or any wallet

3. Verify funding:
```typescript
const newBalance = await bot.viem.getBalance({ address: bot.appAddress })
console.log('New balance:', formatEther(newBalance), 'ETH')
```

**Important:** 
- Fund `bot.appAddress` (the smart contract), NOT `bot.botId` (the signer)
- See [Bot Wallet Architecture & Funding](#bot-wallet-architecture--funding) section for full details

### Issue: Can't mention users

**Format:**
```typescript
// NO WRONG
await ctx.send("@username hello")

// YES CORRECT
await ctx.send("Hello <@0x1234...>", {
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
bun install

# 2. Create .env file
cp .env.sample .env
# Edit .env with your credentials

# 3. Build and run
bun build
bun start

# 4. For development with hot reload
bun  dev
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
bun dev                # Start with hot reload
bun build             # Build for production
bun start             # Run production build
bun test              # Run tests
bun lint              # Check code quality
bun typecheck         # Verify types
```

## Summary for AI Agents

To build a Towns bot:

1. **Understand limitations**: Stateless, no history, isolated events
2. **Choose storage strategy**: Based on your hosting environment
3. **Implement handlers**: Focus on single-event responses
4. **Handle context externally**: Use database/in-memory for state
5. **Deploy appropriately**: Match hosting to storage needs

Remember: The bot framework handles encryption, authentication, and routing. You focus on business logic within the constraints of stateless event processing.