import { onchainTable, relations } from 'ponder'

export const space = onchainTable('spaces', (t) => ({
    id: t.hex().primaryKey(),
    owner: t.hex(),
    tokenId: t.bigint(),
    name: t.text(),
    uri: t.text(),
    shortDescription: t.text(),
    longDescription: t.text(),
    createdAt: t.bigint(),
    paused: t.boolean(),
    totalAmountStaked: t.bigint().default(0n),
    swapVolume24h: t.bigint().default(0n),
    swapVolume7d: t.bigint().default(0n),
    swapVolume30d: t.bigint().default(0n),
    swapVolume: t.bigint().default(0n),
    tipVolume24h: t.bigint().default(0n),
    tipVolume7d: t.bigint().default(0n),
    tipVolume30d: t.bigint().default(0n),
    tipVolume: t.bigint().default(0n),
    joinVolume24h: t.bigint().default(0n),
    joinVolume7d: t.bigint().default(0n),
    joinVolume30d: t.bigint().default(0n),
    joinVolume: t.bigint().default(0n),
    memberCount24h: t.bigint().default(0n),
    memberCount7d: t.bigint().default(0n),
    memberCount30d: t.bigint().default(0n),
    memberCount: t.bigint().default(0n),
}))

export const swap = onchainTable('swaps', (t) => ({
    txHash: t.hex().primaryKey(),
    spaceId: t.hex(),
    recipient: t.hex(),
    tokenIn: t.hex(),
    tokenOut: t.hex(),
    amountIn: t.bigint(),
    amountOut: t.bigint(),
    poster: t.hex(),
    blockTimestamp: t.bigint(),
    createdAt: t.bigint(),
}))

// Denormalized events table for all analytics
export const analyticsEvent = onchainTable('analytics_events', (t) => ({
    id: t.text().primaryKey(), // ${txHash}-${logIndex}
    spaceId: t.hex(),
    eventType: t.text(), // 'swap', 'tip', etc.
    blockTimestamp: t.bigint(),
    txHash: t.hex(),

    // ETH value for the event (calculated field for sorting/aggregation)
    ethAmount: t.bigint().default(0n),

    // Event-specific data stored as JSON
    // For swap: { tokenIn, tokenOut, amountIn, amountOut, recipient, poster }
    // For tip: { sender, receiver, currency, amount, tokenId, messageId, channelId }
    // for join: { sender }
    eventData: t.json(),
}))

export const swapFee = onchainTable('swap_fees', (t) => ({
    spaceId: t.hex().primaryKey(),
    posterFeeBps: t.integer(),
    collectPosterFeeToSpace: t.boolean(),
    createdAt: t.bigint(),
}))

// each space has one swap fee
export const spaceToSwapFee = relations(space, ({ one }) => ({
    swapFee: one(swapFee, { fields: [space.id], references: [swapFee.spaceId] }),
}))

// each space has many swaps
export const spaceToSwaps = relations(space, ({ many }) => ({
    swaps: many(swap),
}))

// each space has many analytics events
export const spaceToAnalyticsEvents = relations(space, ({ many }) => ({
    analyticsEvents: many(analyticsEvent),
}))

// each swap belongs to a space
export const swapToSpace = relations(swap, ({ one }) => ({
    space: one(space, { fields: [swap.spaceId], references: [space.id] }),
}))

// each analytics event belongs to a space
export const analyticsEventToSpace = relations(analyticsEvent, ({ one }) => ({
    space: one(space, { fields: [analyticsEvent.spaceId], references: [space.id] }),
}))

export const swapRouter = onchainTable('swap_router', (t) => ({
    txHash: t.hex().primaryKey(),
    spaceFactory: t.hex(),
    createdAt: t.bigint(),
}))

// each swap belongs to a swap router
export const swapToSwapRouter = relations(swap, ({ one }) => ({
    swapRouter: one(swapRouter, { fields: [swap.txHash], references: [swapRouter.txHash] }),
}))

export const swapRouterSwap = onchainTable('swap_router_swap', (t) => ({
    txHash: t.hex().primaryKey(),
    router: t.hex(),
    caller: t.hex(),
    tokenIn: t.hex(),
    tokenOut: t.hex(),
    amountIn: t.bigint(),
    amountOut: t.bigint(),
    recipient: t.hex(),
    blockTimestamp: t.bigint(),
    createdAt: t.bigint(),
}))

// each swap belongs to a swap router swap
export const swapToSwapRouterSwap = relations(swap, ({ one }) => ({
    swapRouterSwap: one(swapRouterSwap, {
        fields: [swap.txHash],
        references: [swapRouterSwap.txHash],
    }),
}))

export const feeDistribution = onchainTable('fee_distribution', (t) => ({
    txHash: t.hex().primaryKey(),
    token: t.hex(),
    treasury: t.hex(),
    poster: t.hex(),
    treasuryAmount: t.bigint(),
    posterAmount: t.bigint(),
    createdAt: t.bigint(),
}))

// each fee distribution belongs to a swap router swap
export const feeDistributionToSwapRouterSwap = relations(feeDistribution, ({ one }) => ({
    swapRouterSwap: one(swapRouterSwap, {
        fields: [feeDistribution.txHash],
        references: [swapRouterSwap.txHash],
    }),
}))

// stakers
export const stakers = onchainTable('stakers', (t) => ({
    depositId: t.bigint().primaryKey(),
    owner: t.hex(),
    delegatee: t.hex(),
    beneficiary: t.hex(),
    amount: t.bigint(),
    createdAt: t.bigint(),
}))

// each staker can optionally belong to a space
export const stakingToSpace = relations(stakers, ({ one }) => ({
    space: one(space, {
        fields: [stakers.delegatee],
        references: [space.id],
    }),
}))

// each space can have many stakers
export const spaceToStakers = relations(space, ({ many }) => ({
    stakers: many(stakers),
}))

// operators
export const operator = onchainTable('operators', (t) => ({
    address: t.hex().primaryKey(),
    status: t.integer(),
    createdAt: t.bigint(),
}))

// each staker can optionally belong to an operator
export const stakingToOperator = relations(stakers, ({ one }) => ({
    operator: one(operator, {
        fields: [stakers.delegatee],
        references: [operator.address],
    }),
}))

// each operator can have many stakings
export const operatorToStakings = relations(operator, ({ many }) => ({
    stakings: many(stakers),
}))

// apps
export const app = onchainTable('apps', (t) => ({
    address: t.hex().primaryKey(),
    appId: t.hex(),
    client: t.hex(),
    module: t.hex(),
    owner: t.hex(),
    createdAt: t.bigint(),
    permissions: t.text().array(),
    isRegistered: t.boolean().default(false),
    isBanned: t.boolean().default(false),
    installedIn: t.hex().array(),
}))
