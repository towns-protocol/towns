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

// each swap belongs to a space
export const swapToSpace = relations(swap, ({ one }) => ({
    space: one(space, { fields: [swap.spaceId], references: [space.id] }),
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
