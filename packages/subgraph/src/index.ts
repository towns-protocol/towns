import { ponder } from 'ponder:registry'
import schema from 'ponder:schema'

ponder.on('CreateSpace:SpaceCreated', async ({ event, context }) => {
    await context.db.insert(schema.space).values({
        id: event.args.space,
        owner: event.args.owner,
        tokenId: event.args.tokenId,
    })
})
