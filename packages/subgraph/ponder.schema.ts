import { onchainTable } from 'ponder'

export const Space = onchainTable('spaces', (t) => ({
    id: t.hex().primaryKey(),
    owner: t.hex(),
    tokenId: t.bigint(),
}))
