import { eq } from 'ponder'
import { ponder } from 'ponder:registry'
import schema from 'ponder:schema'
import { createPublicClient, http } from 'viem'

const publicClient = createPublicClient({
    transport: http(process.env.PONDER_RPC_URL_1),
})

async function getLatestBlockNumber() {
    return await publicClient.getBlockNumber()
}

ponder.on('CreateSpace:SpaceCreated', async ({ event, context }) => {
    // Get latest block number
    const blockNumber = await getLatestBlockNumber()
    const { SpaceOwner, PausableFacet } = context.contracts

    let paused = false

    try {
        paused = await context.client.readContract({
            abi: PausableFacet.abi,
            address: PausableFacet.address,
            functionName: 'paused',
            args: [],
            blockNumber, // Use the latest block number
        })
    } catch (pausedError) {
        console.error(`Error fetching paused status at blockNumber ${blockNumber}:`, pausedError)
        console.log(`Defaulting paused status to false for space ${event.args.space}`)
    }

    try {
        const space = await context.client.readContract({
            abi: SpaceOwner.abi,
            address: SpaceOwner.address,
            functionName: 'getSpaceInfo',
            args: [event.args.space],
            blockNumber, // Use the latest block number
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
    } catch (error) {
        console.error(`Error fetching space info at blockNumber ${blockNumber}:`, error)
    }
})

ponder.on('SpaceOwner:SpaceOwner__UpdateSpace', async ({ event, context }) => {
    // Get latest block number
    const blockNumber = await getLatestBlockNumber()
    const { SpaceOwner, PausableFacet } = context.contracts

    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, event.args.space),
    })
    if (!space) {
        return
    }

    let paused = false

    try {
        paused = await context.client.readContract({
            abi: PausableFacet.abi,
            address: PausableFacet.address,
            functionName: 'paused',
            args: [],
            blockNumber, // Use the latest block number
        })
    } catch (pausedError) {
        console.error(`Error fetching paused status at blockNumber ${blockNumber}:`, pausedError)
        console.log(`Defaulting paused status to false for space ${event.args.space}`)
    }

    try {
        const spaceInfo = await context.client.readContract({
            abi: SpaceOwner.abi,
            address: SpaceOwner.address,
            functionName: 'getSpaceInfo',
            args: [event.args.space],
            blockNumber, // Use the latest block number
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
    } catch (error) {
        console.error(`Error fetching space info at blockNumber ${blockNumber}:`, error)
    }
})
