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
