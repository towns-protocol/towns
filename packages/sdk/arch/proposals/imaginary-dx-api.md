# Proposal: Imaginary DX API Primitives for Towns SDK

## Executive Summary

After deep analysis of the SDK architecture (8 layers), protocol definitions (72 error codes, 4 services, 11 payload types), and current implementation patterns, I've identified **12 missing primitives** that could dramatically improve developer experience. This proposal presents imaginary APIs that prioritize ergonomics, type safety, and modern patterns.

---

## Current State Analysis

### Pain Points Identified

| Category | Pain Point | Severity |
|----------|-----------|----------|
| Setup | Multiple components required (SignerContext, RpcClient, CryptoStore, EntitlementsDelegate) | High |
| Learning | Custom Observable pattern (not RxJS/Mobx) with `.value` vs `.data` confusion | High |
| Messaging | Requires raw protobuf objects for mentions/attachments | High |
| Encryption | Device key management complexity exposed to developers | Medium |
| Transactions | Manual `newTransactionGroup()` and `commitTransaction()` | Medium |
| Errors | Silent failures with `logger.error()` only | Medium |
| Offline | No built-in offline queue or retry | Medium |
| Testing | No mocking utilities or time travel | Low |

### Architectural Gaps

1. **No declarative data fetching** - Imperative stream management only
2. **No composable effects** - Side effects scattered across callbacks
3. **No presence system** - Typing indicators and online status missing
4. **No batching** - Operations happen one-at-a-time
5. **No middleware** - Cross-cutting concerns hard to implement
6. **No schema validation** - Structured messages lack type safety

---

## Proposed Primitives

### 1. Query-Based Stream Access

**Problem:** Current pattern requires manual subscription management and loading states.

**Imaginary API:**
```typescript
// React hook style (inspired by TanStack Query)
const {
  data: messages,
  isLoading,
  error,
  refetch,
  hasNextPage,
  fetchNextPage
} = useStream(channelId, {
  select: (stream) => stream.timeline.events,
  staleTime: 5_000,
  gcTime: 30_000,
  refetchOnWindowFocus: true,
})

// Infinite scroll built-in
const { data, fetchNextPage, hasNextPage } = useInfiniteStream(channelId, {
  pageSize: 50,
  getNextPageParam: (lastPage) => lastPage.minMiniblockNum,
})

// Non-React usage
const query = agent.query(channelId, {
  select: (stream) => stream.timeline.events.slice(-100),
})
query.subscribe(({ data, error, isStale }) => { /* ... */ })
await query.refetch()
```

**Benefits:**
- Automatic cache management
- Built-in loading/error states
- Pagination out of the box
- Framework-agnostic core with React bindings

---

### 2. Composable Message Functions (Tree-Shakeable)

**Problem:** Sending rich messages requires constructing protobuf objects.

**Current:**
```typescript
await channel.sendMessage(text, {
  mentions: [{ userId, displayName, mentionBehavior: ChannelMessage_Post_Mention_MentionBehavior.DISPLAY_NAME }],
  attachments: [{ image: { content: chunkedMedia, info } }],
  threadId,
})
```

**Imaginary API:** (inspired by `RuleBuilder.ts` pattern)
```typescript
import {
  text, mention, attachment, link, poll,
  inThread, replyTo,
  combine
} from '@towns/sdk/message'

// Simple composable functions returning MessagePart
const message = combine(
  text("Hey "),
  mention(aliceUserId),
  text("! Check this out:"),
  attachment(file),
  link("https://example.com", { preview: true }),
)

await channel.send(message, { threadId, replyId })

// Each function is standalone and tree-shakeable
const pollMessage = poll({
  question: "Favorite color?",
  options: ["Red", "Blue", "Green"],
  multiSelect: false,
  expiresAt: Date.now() + hours(24),
})

await channel.send(pollMessage)

// Composing complex messages
const richMessage = combine(
  text("Poll time! "),
  mention(aliceUserId),
  poll({ question: "...", options: ["A", "B"] }),
)

// Shorthand for simple text
await channel.send(text("Hello world"))
await channel.send("Hello world")  // string auto-wrapped
```

**Module structure:**
```typescript
// message/text.ts
export const text = (content: string): MessagePart =>
  ({ type: 'text', content })

// message/mention.ts
export const mention = (userId: string): MessagePart =>
  ({ type: 'mention', userId })

// message/combine.ts
export const combine = (...parts: MessagePart[]): Message =>
  ({ parts })

// message/index.ts - re-exports for convenience
export { text, mention, attachment, link, poll, combine }
```

**Benefits:**
- Tree-shakeable - only import what you use
- Composable with standard function composition
- No class instances or method chaining
- Each function is independently testable

---

### 3. Effect System for Reactive Logic (Composable Handlers)

**Problem:** Event handling requires manual subscription management.

**Imaginary API:**
```typescript
import {
  onMessage, onMemberJoined, onReaction,
  filter, debounce, throttle,
  inChannel, fromUser, mentionsMe,
  registerEffects
} from '@towns/sdk/effects'

// Composable effect handlers
const welcomeEffect = onMemberJoined(async (event, ctx) => {
  await ctx.sendMessage(event.channelId, `Welcome ${event.userId}!`)
})

// Filter combinators (like RuleBuilder pattern)
const filteredEffect = onMessage(
  filter(inChannel(channelId)),
  filter(fromUser(specificUserId)),
  debounce(1000),
  async (event, ctx) => {
    // Only fires for matching events, debounced
  }
)

// Mention detection
const mentionEffect = onMessage(
  filter(mentionsMe()),
  async (event, ctx) => {
    await ctx.react(event.id, '👋')
  }
)

// Register multiple effects at once
const unsubscribe = registerEffects(agent, [
  welcomeEffect,
  filteredEffect,
  mentionEffect,
])

// Cleanup
unsubscribe()

// Pre-built effect factories
import { autoReact, autoReply } from '@towns/sdk/effects/prebuilt'

registerEffects(agent, [
  autoReact({ trigger: /🎉/, reaction: '🎊' }),
  autoReply({ trigger: /^\/help$/, reply: 'Available commands...' }),
])
```

**Module structure:**
```typescript
// effects/on.ts
export const onMessage = (...middlewareAndHandler): Effect =>
  ({ type: 'message', middlewares, handler })

export const onMemberJoined = (handler): Effect =>
  ({ type: 'member_joined', handler })

// effects/filters.ts
export const filter = (predicate: (e) => boolean): Middleware =>
  (event, next) => predicate(event) ? next(event) : undefined

export const inChannel = (channelId: string) => (e) => e.channelId === channelId
export const fromUser = (userId: string) => (e) => e.userId === userId
export const mentionsMe = () => (e, ctx) => e.mentions?.includes(ctx.userId)

// effects/timing.ts
export const debounce = (ms: number): Middleware => /* ... */
export const throttle = (ms: number): Middleware => /* ... */
```

**Benefits:**
- Tree-shakeable effect imports
- Composable filter predicates
- Middleware pattern for cross-cutting concerns
- Type-safe event payloads

---

### 4. Presence & Typing Indicators

**Problem:** No real-time presence system in the SDK.

**Imaginary API:**
```typescript
// Subscribe to presence
const presence = agent.presence(channelId)

presence.online      // Observable<UserId[]> - who's viewing
presence.typing      // Observable<UserId[]> - who's typing
presence.lastSeen    // Observable<Map<UserId, Date>>

// Set own presence
await presence.setTyping(true)
await presence.setTyping(false)

// Auto-typing detection (wraps input)
const typingInput = presence.wrapInput(inputElement, {
  debounceMs: 500,
  autoStop: true,  // Stops after 5s of inactivity
})

// React hook
const { online, typing, setTyping } = usePresence(channelId)

// Presence-aware member list
const members = channel.members.withPresence()
members.map(m => ({
  ...m,
  isOnline: m.presence.online,
  isTyping: m.presence.typing,
  lastSeenAt: m.presence.lastSeen,
}))
```

**Benefits:**
- Real-time collaboration features
- Simple integration with UI
- Auto-managed typing state

---

### 5. Transaction Batching (Composable Operations)

**Problem:** Multiple operations execute sequentially without atomicity.

**Imaginary API:**
```typescript
import {
  batch, joinSpace, joinChannel, setDisplayName, sendMessage,
  when, sequence
} from '@towns/sdk/operations'

// Batch operations with automatic rollback on failure
const result = await batch(
  joinSpace(spaceId),
  joinChannel(channelId),
  setDisplayName("Alice"),
  sendMessage(channelId, "Hello everyone!"),
).commit(agent)

// result.success: boolean
// result.operations: { operation, success, error }[]
// result.rollback(): Promise<void>  // Undo successful ops

// Optimistic updates
const ops = batch(
  sendMessage(channelId, "Quick message"),
  { optimistic: true }
)

const result = await ops.commit(agent, {
  onCommit: () => console.log('Confirmed!'),
  onRollback: (error) => console.log('Failed:', error),
})

// Conditional operations
const conditionalOps = when(
  () => channel.members.count < 100,
  invite(userId),
  skip()  // or fail('Channel full')
)

await batch(conditionalOps).commit(agent)

// Sequential operations (order matters)
await sequence(
  createChannel(spaceId, "general"),
  (channelId) => sendMessage(channelId, "Welcome!"),
).commit(agent)
```

**Module structure:**
```typescript
// operations/join.ts
export const joinSpace = (spaceId: string): Operation =>
  ({ type: 'join_space', spaceId })

export const joinChannel = (channelId: string): Operation =>
  ({ type: 'join_channel', channelId })

// operations/batch.ts
export const batch = (...ops: Operation[]): BatchedOperations =>
  ({ operations: ops, commit: (agent) => executeBatch(agent, ops) })

// operations/control.ts
export const when = (condition: () => boolean, then: Operation, else_?: Operation): Operation =>
  ({ type: 'conditional', condition, then, else_ })

export const sequence = (...ops: (Operation | ((prev: any) => Operation))[]): Operation =>
  ({ type: 'sequence', operations: ops })
```

**Benefits:**
- Tree-shakeable operation imports
- Composable with standard functions
- Conditional and sequential control flow
- No method chaining or builders

---

### 6. Computed Streams (Selectors)

**Problem:** Derived state requires manual observable composition.

**Imaginary API:**
```typescript
// Memoized computed values
const unreadCount = agent.computed(
  [channel.timeline, channel.readMarker],
  (timeline, marker) => timeline.filter(e => e.timestamp > marker).length
)

// With dependencies
const filteredMessages = agent.computed(
  [channel.timeline, searchQuery],
  (timeline, query) => timeline.filter(e => e.text.includes(query)),
  { equals: deepEqual }  // Custom equality
)

// Async computed
const enrichedMembers = agent.computedAsync(
  channel.members,
  async (members) => {
    const profiles = await fetchProfiles(members.map(m => m.userId))
    return members.map(m => ({ ...m, profile: profiles[m.userId] }))
  },
  { staleTime: 60_000 }
)

// React integration
const count = useComputed(() => channel.timeline.value.length)

// Selector composition
const spaceStats = agent.computed(
  [space.channels.map(c => c.timeline.length)],
  (lengths) => ({
    totalMessages: sum(lengths),
    averagePerChannel: mean(lengths),
    mostActive: argMax(lengths),
  })
)
```

**Benefits:**
- Automatic dependency tracking
- Memoization prevents recomputation
- Async support for enrichment
- Composable with existing observables

---

### 7. Offline Queue

**Problem:** No built-in offline support; messages fail when disconnected.

**Imaginary API:**
```typescript
// Offline-first messaging
const { send, queue, status } = agent.offline(channelId)

await send("This queues if offline")

queue.pending        // number of queued messages
queue.items          // Observable<QueuedMessage[]>
queue.flush()        // Force send all
queue.clear()        // Discard all
queue.retry(itemId)  // Retry specific item

status.isOnline      // Observable<boolean>
status.lastOnline    // Date
status.reconnectIn   // Observable<number> (seconds)

// Configuration
const offlineAgent = agent.withOffline({
  maxQueueSize: 100,
  retryStrategy: 'exponential',  // or 'linear', 'immediate'
  maxRetries: 5,
  persistQueue: true,  // Survive app restart
})

// React hook
const { send, isPending, error, retry } = useOfflineSend(channelId)

// Global offline status
const { isOnline, pendingCount } = useNetworkStatus()
```

**Benefits:**
- Offline-first by default
- Persistent queue survives restarts
- Configurable retry strategies
- React hooks for UI feedback

---

### 8. Schema-Validated Messages

**Problem:** Structured app messages lack type safety.

**Imaginary API:**
```typescript
import { z } from 'zod'

// Define schema
const PollSchema = z.object({
  type: z.literal('poll'),
  question: z.string().max(500),
  options: z.array(z.string()).min(2).max(10),
  multiSelect: z.boolean().default(false),
  expiresAt: z.date().optional(),
})

// Send validated structured message
await channel.sendStructured(PollSchema, {
  type: 'poll',
  question: "What should we build next?",
  options: ["Feature A", "Feature B", "Feature C"],
})

// Receive with type safety
channel.onStructured(PollSchema, (poll, event) => {
  // poll is fully typed as z.infer<typeof PollSchema>
  console.log(poll.question, poll.options)
})

// Register app-wide schemas
agent.registerSchema('poll', PollSchema)
agent.registerSchema('form-response', FormResponseSchema)

// Type-safe message querying
const polls = channel.timeline
  .filter(e => e.matchesSchema(PollSchema))
  .map(e => e.structured<typeof PollSchema>())
```

**Benefits:**
- Runtime validation
- TypeScript inference
- Schema registry for apps
- Safe deserialization

---

### 9. Middleware / Interceptors (Composable Pipeline)

**Problem:** Cross-cutting concerns (logging, rate limiting, transforms) are hard to implement.

**Imaginary API:**
```typescript
import {
  createMiddleware, compose,
  logging, rateLimiter, retryOnError, offlineQueue,
  forOperation, when
} from '@towns/sdk/middleware'

// Create middleware as simple functions
const timingMiddleware = createMiddleware(async (ctx, next) => {
  const start = Date.now()
  await next()
  console.log(`${ctx.operation} took ${Date.now() - start}ms`)
})

// Compose middleware pipeline
const pipeline = compose(
  logging({ level: 'debug' }),
  rateLimiter({ limit: 10, windowMs: 1000 }),
  retryOnError({ codes: ['UNAVAILABLE'], maxRetries: 3 }),
  offlineQueue({ persist: true }),
)

// Create agent with middleware
const agent = createAgent({
  middleware: pipeline,
})

// Operation-specific middleware
const sendMiddleware = compose(
  forOperation('send'),
  rateLimiter({ limit: 10 }),
  contentFilter({ blocklist: ['spam'] }),
)

// Conditional middleware
const conditionalEncryption = when(
  (ctx) => ctx.channel.isEncrypted,
  encryptionMiddleware(),
)

// Combine multiple middleware sets
const fullPipeline = compose(
  timingMiddleware,
  sendMiddleware,
  conditionalEncryption,
)
```

**Module structure:**
```typescript
// middleware/core.ts
export const createMiddleware = (fn: MiddlewareFn): Middleware =>
  ({ execute: fn })

export const compose = (...middlewares: Middleware[]): Middleware =>
  ({ execute: (ctx, next) => runPipeline(middlewares, ctx, next) })

// middleware/operators.ts
export const forOperation = (op: string): Middleware =>
  createMiddleware((ctx, next) => ctx.operation === op ? next() : next())

export const when = (predicate: (ctx) => boolean, middleware: Middleware): Middleware =>
  createMiddleware((ctx, next) => predicate(ctx) ? middleware.execute(ctx, next) : next())

// middleware/builtins.ts
export const logging = (opts): Middleware => /* ... */
export const rateLimiter = (opts): Middleware => /* ... */
export const retryOnError = (opts): Middleware => /* ... */
```

**Benefits:**
- Pure function composition
- Tree-shakeable built-in middleware
- Conditional and operation-specific application
- No method chaining on agent instance

---

### 10. Testing Utilities

**Problem:** No mocking or testing infrastructure.

**Imaginary API:**
```typescript
import { createMockAgent, createMockChannel, timeline } from '@towns/sdk/testing'

// Mock agent
const agent = createMockAgent({
  userId: 'test-user',
  spaces: [createMockSpace({ channels: [createMockChannel()] })],
})

// Simulate events
agent.simulate.receiveMessage({
  channelId,
  from: 'other-user',
  text: 'Hello!',
})

agent.simulate.memberJoined({ channelId, userId: 'new-user' })

// Time travel
agent.time.advance(hours(1))
agent.time.set(new Date('2024-01-01'))

// Assert on state
expect(agent.getChannel(channelId).timeline).toHaveLength(1)
expect(agent.getChannel(channelId).members).toContain('new-user')

// Record and replay
const recording = agent.record()
// ... perform operations ...
const events = recording.stop()
await recording.replay(events)  // Deterministic replay

// Snapshot testing
expect(channel.timeline).toMatchSnapshot()

// Network simulation
agent.network.offline()
await send('queued message')
agent.network.online()
// Message now sends
```

**Benefits:**
- Unit test without network
- Time manipulation for async tests
- Event simulation
- Deterministic replay

---

### 11. Bot Framework (Composable Commands)

**Problem:** Building bots requires low-level event handling.

**Imaginary API:**
```typescript
import {
  createBot,
  command, match, flow,
  withArgs, withMiddleware,
  logging, rateLimit, permissions
} from '@towns/sdk/bot'

// Define commands as standalone functions
const helpCommand = command('/help', async (ctx) => {
  await ctx.reply(`
    Available commands:
    /help - Show this message
    /poll <question> - Create a poll
    /remind <time> <message> - Set a reminder
  `)
})

// Commands with argument parsing
const remindCommand = command(
  '/remind {time} {message}',
  withArgs({ time: parseTime, message: String }),
  async (ctx, { time, message }) => {
    await ctx.scheduleReply(time, `Reminder: ${message}`)
  }
)

// Pattern matching handlers
const thanksHandler = match(
  /\bthank(s| you)\b/i,
  async (ctx) => ctx.react('💜')
)

// Conversation flows as composable units
const onboardingFlow = flow('onboarding', async (ctx, flow) => {
  await ctx.reply('Welcome! What should I call you?')
  const name = await flow.waitForReply({ timeout: 60_000 })

  await ctx.reply(`Nice to meet you, ${name}! What interests you?`)
  const interests = await flow.waitForReply()

  await ctx.reply(`Great! You're all set up.`)
})

// Compose bot from parts
const bot = createBot({
  name: 'HelpBot',
  description: 'Helpful assistant',
  commands: [helpCommand, remindCommand],
  handlers: [thanksHandler],
  flows: [onboardingFlow],
  middleware: compose(
    logging(),
    rateLimit({ perUser: 10, windowMs: 60_000 }),
    permissions({ allowedChannels: [channelId] }),
  ),
})

// Start bot
await bot.start({ token: BEARER_TOKEN })
```

**Module structure:**
```typescript
// bot/command.ts
export const command = (pattern: string, ...handlersOrMiddleware): Command =>
  ({ pattern, handlers: extractHandlers(handlersOrMiddleware) })

export const withArgs = (parsers: Record<string, Parser>): Middleware =>
  (ctx, next) => { ctx.args = parseArgs(ctx.text, parsers); return next() }

// bot/match.ts
export const match = (regex: RegExp, handler: Handler): PatternHandler =>
  ({ regex, handler })

// bot/flow.ts
export const flow = (name: string, handler: FlowHandler): Flow =>
  ({ name, handler })

// bot/createBot.ts
export const createBot = (config: BotConfig): Bot => /* ... */
```

**Benefits:**
- Commands defined as standalone, testable units
- Tree-shakeable imports
- Composable middleware pipeline
- Flows defined separately from bot instance

---

### 12. Encryption Simplification

**Problem:** Device key management and encryption details leak to developers.

**Imaginary API:**
```typescript
// Zero-config encryption (current complexity hidden)
const agent = await createAgent({
  wallet: privateKey,
  // Encryption handled automatically
})

// Optional: encryption status observables
agent.encryption.status        // Observable<'ready' | 'syncing' | 'error'>
agent.encryption.devices       // Observable<Device[]>
agent.encryption.missingKeys   // Observable<StreamId[]>

// Manual key management (advanced)
await agent.encryption.rotateDeviceKey()
await agent.encryption.revokeDevice(deviceId)
await agent.encryption.exportKeys()  // For backup
await agent.encryption.importKeys(backup)

// Decryption status per message
message.encryption.status     // 'decrypted' | 'pending' | 'failed'
message.encryption.retry()    // Manual retry
message.encryption.error      // DecryptionError | null

// Key recovery
agent.encryption.onKeyMissing((streamId, sessionId) => {
  // Automatic solicitation, but hook for UI feedback
  showToast('Requesting decryption keys...')
})

// Encryption health dashboard
const health = agent.encryption.health()
health.decryptionSuccessRate  // 0.95
health.pendingKeySolicitations  // 3
health.deviceCount  // 2
```

**Benefits:**
- Zero-config default
- Observable encryption status
- Graceful degradation
- Health monitoring

---

## Design Principles

All proposed APIs follow these principles (inspired by `RuleBuilder.ts`):

1. **Tree-shakeable** - Import only what you use, bundle only what's imported
2. **Composable functions** - Small functions that combine via `compose()`, `combine()`, etc.
3. **No method chaining** - Avoid `.foo().bar().baz()` patterns on instances
4. **No class instances** - Prefer plain objects and factory functions
5. **Testable in isolation** - Each function works standalone without agent instance
6. **Type-safe** - Full TypeScript inference without manual type annotations

---

## Summary: Priority Matrix

| Primitive | Impact | Complexity | Priority |
|-----------|--------|------------|----------|
| Composable Messages | High | Low | P0 |
| Query-Based Access | High | Medium | P0 |
| Effect System | High | Medium | P1 |
| Offline Queue | High | Medium | P1 |
| Presence System | Medium | Medium | P1 |
| Computed Streams | Medium | Low | P2 |
| Composable Operations | Medium | Medium | P2 |
| Middleware Pipeline | Medium | Medium | P2 |
| Schema Validation | Medium | Low | P2 |
| Bot Framework | Medium | High | P3 |
| Testing Utilities | Low | Medium | P3 |
| Encryption Simplification | Low | High | P3 |

---

## Next Steps

1. **Gather feedback** on which primitives resonate most with the team
2. **Prototype** the P0 primitives (Composable Messages, Query-Based Access)
3. **RFC** for each primitive with detailed implementation design
4. **Incremental rollout** starting with non-breaking additions

---

*This proposal presents imaginary APIs as conversation starters. All APIs follow the composable function pattern established in `@packages/web3/src/space/entitlements/RuleBuilder.ts`. Actual implementation would require protocol changes, performance analysis, and backward compatibility planning.*
