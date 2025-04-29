import { eq } from 'ponder'
import { ponder } from 'ponder:registry'
import schema from 'ponder:schema'

ponder.on('CreateSpace:SpaceCreated', async ({ event, context }) => {
    const space = await context.client.readContract({
        abi: context.contracts.SpaceOwner.abi,
        address: context.contracts.SpaceOwner.address,
        functionName: 'getSpaceInfo',
        args: [event.args.space],
    })
    const paused = await context.client.readContract({
        abi: context.contracts.TokenPausableFacet.abi,
        address: context.contracts.TokenPausableFacet.address,
        functionName: 'paused',
        args: [],
    })
    await context.db.insert(schema.space).values({
        id: event.args.space,
        owner: event.args.owner,
        tokenId: event.args.tokenId,
        name: space.name,
        uri: space.uri,
        shortDescription: space.shortDescription,
        longDescription: space.longDescription,
        createdAt: space.createdAt,
        paused: paused,
    })
})

ponder.on('SpaceOwner:SpaceOwner__UpdateSpace', async ({ event, context }) => {
    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, event.args.space),
    })
    if (!space) {
        return
    }
    const paused = await context.client.readContract({
        abi: context.contracts.TokenPausableFacet.abi,
        address: context.contracts.TokenPausableFacet.address,
        functionName: 'paused',
        args: [],
    })
    const spaceInfo = await context.client.readContract({
        abi: context.contracts.SpaceOwner.abi,
        address: context.contracts.SpaceOwner.address,
        functionName: 'getSpaceInfo',
        args: [event.args.space],
    })

    await context.db.sql
        .update(schema.space)
        .set({
            paused: paused,
            name: spaceInfo.name,
            uri: spaceInfo.uri,
            shortDescription: spaceInfo.shortDescription,
            longDescription: spaceInfo.longDescription,
        })
        .where(eq(schema.space.id, event.args.space))
})
