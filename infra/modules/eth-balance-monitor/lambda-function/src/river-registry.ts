import { Address, PublicClient } from 'viem'
import { RiverNode } from './river-node'
import NodeRegistryAbi from '@river-build/generated/v3/abis/NodeRegistry.abi'
import StreamRegistryAbi from '@river-build/generated/v3/abis/StreamRegistry.abi'

export type RiverNodeWithStreamCount = {
    node: RiverNode
    streamCount: number
}

export class RiverRegistry {
    private client: PublicClient
    private address: Address

    constructor(params: { client: PublicClient; address: Address }) {
        this.client = params.client
        this.address = params.address
    }

    async getAllNodes(): Promise<readonly RiverNode[]> {
        const nodes = await this.client.readContract({
            abi: NodeRegistryAbi,
            address: this.address,
            functionName: 'getAllNodes',
        })

        console.log(`Got nodes: `, nodes)

        return nodes
    }

    async getTotalStreamCount() {
        const streamCount = await this.client.readContract({
            abi: StreamRegistryAbi,
            address: this.address,
            functionName: 'getStreamCount',
        })

        console.log(`Got stream count: `, streamCount)

        return streamCount
    }

    private async getStreamsOnNode(node: RiverNode) {
        const streamsOnNode = await this.client.readContract({
            abi: StreamRegistryAbi,
            address: this.address,
            functionName: 'getStreamsOnNode',
            args: [node.nodeAddress],
        })

        return streamsOnNode
    }

    private async getStreamCountOnNode(node: RiverNode) {
        const streams = await this.getStreamsOnNode(node)
        return streams.length
    }

    public async getStreamCountsOnNodes(
        nodes: readonly RiverNode[],
    ): Promise<RiverNodeWithStreamCount[]> {
        console.log('getting stream couns on nodes')
        const promises = nodes.map((node) => this.getStreamCountOnNode(node))

        const streamCounts = await Promise.all(promises)

        const nodesWithStreamCounts = streamCounts.map((streamCount, index) => ({
            node: nodes[index],
            streamCount: Number(streamCount),
        }))

        console.log(`Got stream counts on nodes: `, JSON.stringify(nodesWithStreamCounts, null, 2))

        return nodesWithStreamCounts
    }
}
