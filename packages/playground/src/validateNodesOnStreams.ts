import type { Address, Hex } from 'viem'
import { createPublicClient, getContract, http } from 'viem'
import CONTRACT_ABI from '@river-build/generated/dev/abis/StreamRegistry.abi.ts'
import { towns } from '@river-build/web3/src/chain.ts'
import fs from 'fs'

const STREAM_REGISTRY_ADDRESS = '0x1298c03Fde548dc433a452573E36A713b38A0404'
const BATCH_SIZE = 1000n
let maxRetryCount = 10

const publicClient = createPublicClient({
    chain: towns,
    transport: http(),
})

const streamRegistry = getContract({
    address: STREAM_REGISTRY_ADDRESS,
    abi: CONTRACT_ABI,
    client: publicClient,
})

const streamIdsByNode: Record<Address, Set<Hex>> = {}
const missingStreamIdsByNode: Record<Address, Set<Hex>> = {}

async function main() {
    const streamCount = await streamRegistry.read.getStreamCount()
    console.log(`Total streams: ${streamCount}`)

    // populate streamIdsByNode
    for (let currentStart = 0n; currentStart < streamCount; currentStart += BATCH_SIZE) {
        const currentStop = currentStart + BATCH_SIZE

        try {
            console.log(
                `\nCalling getPaginatedStreams: start = ${currentStart}, stop = ${currentStop}`,
            )
            const [streams] = await streamRegistry.read.getPaginatedStreams([
                currentStart,
                currentStop,
            ])
            for (const { id, stream } of streams) {
                const nodes = stream.nodes
                for (const node of nodes) {
                    if (!streamIdsByNode[node]) {
                        streamIdsByNode[node] = new Set()
                    }
                    streamIdsByNode[node].add(id)
                }
            }
        } catch (error) {
            console.error(
                `Error calling getPaginatedStreams from ${currentStart} to ${currentStop}:`,
                error,
            )
            if (maxRetryCount-- === 0) {
                console.error('Max retry count reached. Exiting.')
                break
            }
            // sleep for 10 seconds and retry
            await new Promise((resolve) => setTimeout(resolve, 10000))
            currentStart -= BATCH_SIZE
        }
    }

    // validate getPaginatedStreamsOnNode against streamIdsByNode
    for (const node_ in streamIdsByNode) {
        const node: Address = node_ as Address
        const streamIds: Set<Hex> = new Set()
        const streamCountOnNode = await streamRegistry.read.getStreamCountOnNode([node])
        for (let currentStart = 0n; currentStart < streamCountOnNode; currentStart += BATCH_SIZE) {
            const currentStop = currentStart + BATCH_SIZE

            try {
                console.log(
                    `\nCalling getPaginatedStreamsOnNode: ${node}, start = ${currentStart}, stop = ${currentStop}`,
                )
                const streams = await streamRegistry.read.getPaginatedStreamsOnNode([
                    node,
                    currentStart,
                    currentStop,
                ])
                for (const { id } of streams) {
                    streamIds.add(id)
                }
            } catch (error) {
                console.error(
                    `Error calling getPaginatedStreamsOnNode on node ${node} from ${currentStart} to ${currentStop}:`,
                    error,
                )
                if (maxRetryCount-- === 0) {
                    console.error('Max retry count reached. Exiting.')
                    break
                }
                // sleep for 10 seconds and retry
                await new Promise((resolve) => setTimeout(resolve, 10000))
                currentStart -= BATCH_SIZE
            }
        }
        // filter out stream ids that are in streamIdsByNode but not in streamIds
        missingStreamIdsByNode[node] = new Set(
            Array.from(streamIdsByNode[node]).filter((id) => !streamIds.has(id)),
        )
        if (missingStreamIdsByNode[node].size > 0) {
            console.error(
                `Missing stream ids for node ${node}: ${Array.from(
                    missingStreamIdsByNode[node],
                ).join(', ')}`,
            )
        }
    }

    // write missing stream ids to file if any
    // convert the set to array and write to a json
    const missingStreamIdsByNodeArray = Object.entries(missingStreamIdsByNode).map(
        ([node, streamIds]) => {
            return {
                node,
                streamIds: Array.from(streamIds),
            }
        },
    )
    if (missingStreamIdsByNodeArray.length > 0) {
        fs.writeFileSync(
            'missingStreamIdsByNode.json',
            JSON.stringify(missingStreamIdsByNodeArray, null, 2),
        )
    }

    console.log('\nAll batches validated.')
}

main().catch((error) => {
    console.error('Unexpected error:', error)
})
