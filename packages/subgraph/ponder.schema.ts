import { onchainTable } from 'ponder'

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
