import { onchainTable, onchainEnum, primaryKey, relations, index } from 'ponder'
import { AgentData } from './src/agentData'

export const analyticsEventType = onchainEnum('analytics_event_type', [
    'swap',
    'tip',
    'join',
    'review',
])

// Actor type enum for tip events
export type ActorType = 'Member' | 'Bot'

// Type definitions for analytics event data
export type SwapEventData = {
    type: 'swap'
    tokenIn: string
    tokenOut: string
    amountIn: string
    amountOut: string
    recipient: string
    poster: string
}

export type TipEventData = {
    type: 'tip'
    sender: string
    senderType: ActorType
    receiver: string
    recipientType: ActorType
    currency: string
    amount: string
    tokenId?: string
    messageId?: string
    channelId?: string
}

export type JoinEventData = {
    type: 'join'
    recipient?: string
    tokenId?: string
    currency?: string
    price?: string
    protocolFee?: string
    totalAmount?: string
}

export type ReviewEventData = {
    type: 'review'
    user: string
    rating: number
    comment: string
}

export type AnalyticsEventData = SwapEventData | TipEventData | JoinEventData | ReviewEventData

export const space = onchainTable(
    'spaces',
    (t) => ({
        id: t.hex().primaryKey(),
        owner: t.hex().notNull(),
        tokenId: t.bigint().notNull(),
        name: t.text().notNull(),
        nameLowercased: t.text().notNull(),
        uri: t.text().notNull(),
        shortDescription: t.text().notNull(),
        longDescription: t.text().notNull(),
        createdAt: t.bigint().notNull(),
        paused: t.boolean().notNull(),
        totalAmountStaked: t.bigint().default(0n),
        swapVolume: t.bigint().default(0n),
        // ETH-denominated volumes
        tipVolume: t.bigint().default(0n),
        botTipVolume: t.bigint().default(0n),
        joinVolume: t.bigint().default(0n),
        // USDC-denominated volumes
        tipUSDCVolume: t.bigint().default(0n),
        botTipUSDCVolume: t.bigint().default(0n),
        joinUSDCVolume: t.bigint().default(0n),
        // Cached membership currency (ETH address = 0xeee...eee)
        currency: t.hex().default('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'),
        memberCount: t.bigint().default(0n),
        reviewCount: t.bigint().default(0n),
    }),
    (table) => ({
        tokenIdIdx: index().on(table.tokenId),
        totalAmountStakedIdx: index().on(table.totalAmountStaked),
    }),
)

export const swap = onchainTable('swaps', (t) => ({
    txHash: t.hex().primaryKey(),
    spaceId: t.hex().notNull(),
    recipient: t.hex().notNull(),
    tokenIn: t.hex().notNull(),
    tokenOut: t.hex().notNull(),
    amountIn: t.bigint().notNull(),
    amountOut: t.bigint().notNull(),
    poster: t.hex().notNull(),
    blockTimestamp: t.bigint().notNull(),
    createdAt: t.bigint().notNull(),
}))

// Denormalized events table for all analytics
export const analyticsEvent = onchainTable(
    'analytics_events',
    (t) => ({
        txHash: t.hex().notNull(),
        logIndex: t.integer().notNull(),
        spaceId: t.hex().notNull(),
        eventType: analyticsEventType().notNull(),
        blockTimestamp: t.bigint().notNull(),
        // ETH value for the event (calculated field for sorting/aggregation)
        ethAmount: t.bigint().default(0n),
        // USDC value for the event (calculated field for sorting/aggregation)
        usdcAmount: t.bigint().default(0n),

        // Event-specific data stored as typed JSON
        eventData: t.json().$type<AnalyticsEventData>().notNull(),
    }),
    (table) => ({
        pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
        txHashIdx: index().on(table.txHash),
        logIndexIdx: index().on(table.logIndex),
        spaceIdx: index().on(table.spaceId),
        timestampIdx: index().on(table.blockTimestamp),
        eventTypeIdx: index().on(table.eventType),
        spaceEventTypeTimestampIdx: index().on(
            table.spaceId,
            table.eventType,
            table.blockTimestamp,
        ),
    }),
)

export const swapFee = onchainTable('swap_fees', (t) => ({
    spaceId: t.hex().primaryKey(),
    posterFeeBps: t.integer().notNull(),
    collectPosterFeeToSpace: t.boolean().notNull(),
    createdAt: t.bigint().notNull(),
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
    spaceFactory: t.hex().notNull(),
    createdAt: t.bigint().notNull(),
}))

// each swap belongs to a swap router
export const swapToSwapRouter = relations(swap, ({ one }) => ({
    swapRouter: one(swapRouter, { fields: [swap.txHash], references: [swapRouter.txHash] }),
}))

export const swapRouterSwap = onchainTable('swap_router_swap', (t) => ({
    txHash: t.hex().primaryKey(),
    router: t.hex().notNull(),
    caller: t.hex().notNull(),
    tokenIn: t.hex().notNull(),
    tokenOut: t.hex().notNull(),
    amountIn: t.bigint().notNull(),
    amountOut: t.bigint().notNull(),
    recipient: t.hex().notNull(),
    blockTimestamp: t.bigint().notNull(),
    createdAt: t.bigint().notNull(),
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
    token: t.hex().notNull(),
    treasury: t.hex().notNull(),
    poster: t.hex().notNull(),
    treasuryAmount: t.bigint().notNull(),
    posterAmount: t.bigint().notNull(),
    createdAt: t.bigint().notNull(),
}))

// each fee distribution belongs to a swap router swap
export const feeDistributionToSwapRouterSwap = relations(feeDistribution, ({ one }) => ({
    swapRouterSwap: one(swapRouterSwap, {
        fields: [feeDistribution.txHash],
        references: [swapRouterSwap.txHash],
    }),
}))

// stakers
export const stakers = onchainTable(
    'stakers',
    (t) => ({
        depositId: t.bigint().primaryKey(),
        owner: t.hex().notNull(),
        delegatee: t.hex().notNull(),
        beneficiary: t.hex().notNull(),
        amount: t.bigint().notNull(),
        createdAt: t.bigint().notNull(),
    }),
    (table) => ({
        ownerIdx: index().on(table.owner),
    }),
)

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
    status: t.integer().notNull(),
    createdAt: t.bigint().notNull(),
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
    appId: t.hex().notNull(),
    client: t.hex().notNull(),
    module: t.hex().notNull(),
    owner: t.hex().notNull(),
    createdAt: t.bigint().notNull(),
    permissions: t.text().array().notNull(),
    isRegistered: t.boolean().default(false),
    isBanned: t.boolean().default(false),
    installedIn: t.hex().array().notNull(),
    lastUpdatedAt: t.bigint(),
    currentVersionId: t.hex(),
    tipsCount: t.bigint().default(0n),
    tipsVolume: t.bigint().default(0n),
    tipsVolumeUSDC: t.bigint().default(0n),
}))

// app installations - tracks which apps are installed in which spaces/accounts
export const appInstallation = onchainTable(
    'app_installations',
    (t) => ({
        // Composite key: app + account uniquely identifies an installation
        app: t.hex().notNull(),
        account: t.hex().notNull(),
        // versionId
        appId: t.hex().notNull(),

        // Lifecycle timestamps
        installedAt: t.bigint().notNull(),
        lastUpdatedAt: t.bigint(),
        lastRenewedAt: t.bigint(),
        uninstalledAt: t.bigint(),

        // Transaction metadata
        installTxHash: t.hex().notNull(),
        installLogIndex: t.integer().notNull(),

        // Status
        isActive: t.boolean().default(true).notNull(),
    }),
    (table) => ({
        pk: primaryKey({ columns: [table.app, table.account] }),
        accountIdx: index().on(table.account),
        activeIdx: index().on(table.isActive),
        appIdIdx: index().on(table.appId),
        installedAtIdx: index().on(table.installedAt),
    }),
)

// app versions - tracks version history for apps
export const appVersion = onchainTable(
    'app_versions',
    (t) => ({
        appId: t.hex().notNull(),
        app: t.hex().notNull(),

        // Version metadata
        createdAt: t.bigint().notNull(),
        upgradedFromId: t.hex(),

        // Transaction metadata
        txHash: t.hex().notNull(),
        logIndex: t.integer().notNull(),
        blockNumber: t.bigint().notNull(),

        // Status
        isLatest: t.boolean().default(false).notNull(),
        isCurrent: t.boolean().default(true).notNull(),
    }),
    (table) => ({
        pk: primaryKey({ columns: [table.app, table.appId] }),
        appIdx: index().on(table.app),
        appIdIdx: index().on(table.appId),
        latestIdx: index().on(table.app, table.isLatest),
        currentIdx: index().on(table.isCurrent),
    }),
)

// reviews
export const review = onchainTable(
    'reviews',
    (t) => ({
        spaceId: t.hex().notNull(),
        user: t.hex().notNull(),
        comment: t.text().notNull(),
        rating: t.integer().notNull(),
        createdAt: t.bigint().notNull(),
        updatedAt: t.bigint().notNull(),
    }),
    (table) => ({
        pk: primaryKey({ columns: [table.spaceId, table.user] }),
        spaceIdx: index().on(table.spaceId),
        userIdx: index().on(table.user),
    }),
)

// subscriptions
export const subscription = onchainTable(
    'subscriptions',
    (t) => ({
        account: t.hex().notNull(),
        entityId: t.integer().notNull(),
        space: t.hex().notNull(),
        tokenId: t.bigint().notNull(),
        currency: t.hex(),
        totalSpent: t.bigint().default(0n),
        renewalAmount: t.bigint().default(0n),
        lastRenewalTime: t.bigint(),
        nextRenewalTime: t.bigint().notNull(),
        expiresAt: t.bigint(),
        active: t.boolean().default(true),
        createdAt: t.bigint().notNull(),
        updatedAt: t.bigint().notNull(),
    }),
    (table) => ({
        pk: primaryKey({ columns: [table.account, table.entityId] }),
        spaceIdx: index().on(table.space),
        spaceTokenIdx: index().on(table.space, table.tokenId),
        nextRenewalTimeIdx: index().on(table.nextRenewalTime),
        activeIdx: index().on(table.active),
    }),
)

// subscription failures
export const subscriptionFailure = onchainTable(
    'subscription_failures',
    (t) => ({
        account: t.hex().notNull(),
        entityId: t.integer().notNull(),
        timestamp: t.bigint().notNull(),
        reason: t.text().notNull(),
    }),
    (table) => ({
        pk: primaryKey({ columns: [table.account, table.entityId, table.timestamp] }),
        timestampIdx: index().on(table.timestamp),
    }),
)

// each space has many reviews
export const spaceToReviews = relations(space, ({ many }) => ({
    reviews: many(review),
}))

// each review belongs to a space
export const reviewToSpace = relations(review, ({ one }) => ({
    space: one(space, { fields: [review.spaceId], references: [space.id] }),
}))

// each space has many subscriptions
export const spaceToSubscriptions = relations(space, ({ many }) => ({
    subscriptions: many(subscription),
}))

// each subscription belongs to a space
export const subscriptionToSpace = relations(subscription, ({ one }) => ({
    space: one(space, { fields: [subscription.space], references: [space.id] }),
}))

// each subscription can have many failures
export const subscriptionToFailures = relations(subscription, ({ many }) => ({
    failures: many(subscriptionFailure),
}))

// each failure belongs to a subscription
export const failureToSubscription = relations(subscriptionFailure, ({ one }) => ({
    subscription: one(subscription, {
        fields: [subscriptionFailure.account, subscriptionFailure.entityId],
        references: [subscription.account, subscription.entityId],
    }),
}))

// each app has many installations
export const appToInstallations = relations(app, ({ many }) => ({
    installations: many(appInstallation),
}))

// each installation belongs to an app
export const installationToApp = relations(appInstallation, ({ one }) => ({
    app: one(app, { fields: [appInstallation.app], references: [app.address] }),
}))

// each installation belongs to a space
export const installationToSpace = relations(appInstallation, ({ one }) => ({
    space: one(space, { fields: [appInstallation.account], references: [space.id] }),
}))

// each space has many app installations
export const spaceToInstallations = relations(space, ({ many }) => ({
    appInstallations: many(appInstallation),
}))

// each app has many versions
export const appToVersions = relations(app, ({ many }) => ({
    versions: many(appVersion),
}))

// each version belongs to an app
export const versionToApp = relations(appVersion, ({ one }) => ({
    app: one(app, { fields: [appVersion.app], references: [app.address] }),
}))

// tip leaderboard - per-space tip stats per user (senders only)
export const tipLeaderboard = onchainTable(
    'tip_leaderboard',
    (t) => ({
        user: t.hex().notNull(),
        spaceId: t.hex().notNull(),
        // ETH-denominated tip amounts
        totalSent: t.bigint().default(0n),
        tipsSentCount: t.integer().default(0),
        memberTipsSent: t.integer().default(0),
        memberTotalSent: t.bigint().default(0n),
        botTipsSent: t.integer().default(0),
        botTotalSent: t.bigint().default(0n),
        // USDC-denominated tip amounts
        totalSentUSDC: t.bigint().default(0n),
        memberTotalSentUSDC: t.bigint().default(0n),
        botTotalSentUSDC: t.bigint().default(0n),
        lastActivity: t.bigint().notNull(),
    }),
    (table) => ({
        pk: primaryKey({ columns: [table.user, table.spaceId] }),
        spaceSentIdx: index().on(table.spaceId, table.totalSent),
    }),
)

// Agent Identity Registry - ERC-721 based agent identities for apps
export const agentIdentity = onchainTable(
    'agent_identities',
    (t) => ({
        app: t.hex().notNull(), // FK to apps.address
        agentId: t.bigint().notNull(),
        agentUri: t.text(),
        agentData: t.json().$type<AgentData>(),
        registeredAt: t.bigint().notNull(),
        registeredAtBlock: t.bigint().notNull(),
        updatedAt: t.bigint(),
        transactionHash: t.hex().notNull(),
    }),
    (table) => ({
        pk: primaryKey({ columns: [table.app, table.agentId] }),
        appIdx: index().on(table.app),
        agentIdIdx: index().on(table.agentId),
    }),
)

// Agent Metadata - key-value metadata storage for agents
export const agentMetadata = onchainTable(
    'agent_metadata',
    (t) => ({
        app: t.hex().notNull(), // FK to apps.address
        metadataKey: t.text().notNull(),
        metadataValue: t.hex().notNull(), // bytes from Solidity -> hex string
        setAt: t.bigint().notNull(),
        transactionHash: t.hex().notNull(),
    }),
    (table) => ({
        pk: primaryKey({ columns: [table.app, table.metadataKey] }),
        appIdx: index().on(table.app),
    }),
)

// Agent Feedback - reviews/feedback for agents (ERC-8004 compliant)
export const agentFeedback = onchainTable(
    'agent_feedback',
    (t) => ({
        app: t.hex().notNull(), // FK to apps.address
        agentId: t.bigint().notNull(),
        reviewerAddress: t.hex().notNull(),
        feedbackIndex: t.bigint().notNull(),
        rating: t.integer().notNull(),
        tag1: t.hex(),
        tag2: t.hex(),
        comment: t.text(),
        commentHash: t.hex(),
        isRevoked: t.boolean().default(false).notNull(),
        createdAt: t.bigint().notNull(),
        revokedAt: t.bigint(),
        transactionHash: t.hex().notNull(),
    }),
    (table) => ({
        pk: primaryKey({ columns: [table.agentId, table.reviewerAddress, table.feedbackIndex] }),
        appIdx: index().on(table.app),
        agentIdIdx: index().on(table.agentId),
        reviewerIdx: index().on(table.reviewerAddress),
        ratingIdx: index().on(table.agentId, table.rating),
        activeIdx: index().on(table.agentId, table.isRevoked),
    }),
)

// Feedback Responses - responses to agent feedback
export const feedbackResponse = onchainTable(
    'feedback_responses',
    (t) => ({
        app: t.hex().notNull(), // FK to apps.address
        agentId: t.bigint().notNull(),
        reviewerAddress: t.hex().notNull(),
        feedbackIndex: t.bigint().notNull(),
        responderAddress: t.hex().notNull(),
        comment: t.text(),
        commentHash: t.hex(),
        createdAt: t.bigint().notNull(),
        transactionHash: t.hex().notNull(),
    }),
    (table) => ({
        pk: primaryKey({
            columns: [
                table.agentId,
                table.reviewerAddress,
                table.feedbackIndex,
                table.responderAddress,
                table.createdAt,
            ],
        }),
        appIdx: index().on(table.app),
        agentIdIdx: index().on(table.agentId),
        feedbackIdx: index().on(table.agentId, table.reviewerAddress, table.feedbackIndex),
        responderIdx: index().on(table.responderAddress),
    }),
)

// Agent Reputation Summary - precomputed aggregated stats
export const agentReputationSummary = onchainTable(
    'agent_reputation_summary',
    (t) => ({
        app: t.hex().primaryKey(), // FK to apps.address
        agentId: t.bigint().notNull(),
        totalFeedback: t.integer().notNull().default(0),
        activeFeedback: t.integer().notNull().default(0),
        revokedFeedback: t.integer().notNull().default(0),
        averageRating: t.real(),
        totalResponses: t.integer().notNull().default(0),
        uniqueReviewers: t.integer().notNull().default(0),
        lastFeedbackAt: t.bigint(),
    }),
    (table) => ({
        agentIdIdx: index().on(table.agentId),
        ratingIdx: index().on(table.averageRating),
    }),
)
