import { z } from 'zod'
import { Unpromisify } from './utils'
import { CombinedNode } from './metrics-integrator'

const chainHealthSchema = z.object({
    result: z.string(),
    chain_id: z.number(),
    block: z.number(),
    latency: z.string(),
})

const NodeStatusSchema = z.object({
    status: z.string(),
    instance_id: z.string(),
    address: z.string(),
    version: z.string(),
    start_time: z.string(),
    uptime: z.string(),
    base: chainHealthSchema,
    river: chainHealthSchema,
    other_chains: z.array(chainHealthSchema),
})

export type RiverNodePingResults = Unpromisify<ReturnType<Ping['pingNodes']>>

export class Ping {
    constructor() {}

    private async pingNode(node: CombinedNode) {
        if (typeof node.url === 'undefined') {
            return {
                result: 'exempt' as const,
                message: `Node ${node.nodeAddress} has unknown URL`,
            }
        }
        const url = new URL(node.url)
        url.pathname = '/status'

        let response: Response

        try {
            response = await fetch(url.toString())
        } catch (e: unknown) {
            console.warn(`Failed to ping node ${node.url}: ${e}`)
            return {
                result: 'error' as const,
                message: `Failed to ping node ${node.url}: ${e}`,
            }
        }

        if (response.status !== 200) {
            console.warn(`Node ${node.url} returned status ${response.status}`)
            return {
                result: 'error' as const,
                message: `Node ${node.url} returned status ${response.status}`,
            }
        }

        let jsonResponse: unknown

        try {
            jsonResponse = await response.json()
        } catch (e: unknown) {
            console.warn(`Failed to parse JSON response from node ${node.url}: ${e}`)
            return {
                result: 'error' as const,
                message: `Failed to parse JSON response from node ${node.url}: ${e}`,
            }
        }

        const parsedResponse = NodeStatusSchema.safeParse(jsonResponse)

        if (!parsedResponse.success) {
            console.warn(
                `Failed to validate JSON response from node ${node.url}: ${parsedResponse.error}`,
            )
            return {
                result: 'error' as const,
                message: `Failed to validate JSON response from node ${node.url}: ${parsedResponse.error}`,
            }
        }

        return {
            result: 'success' as const,
            response: parsedResponse.data,
        }
    }

    public async pingNodes(nodes: CombinedNode[]) {
        console.log('Pinging nodes...')
        const promises = nodes.map(async (node) => {
            const ping = await this.pingNode(node)
            return {
                node,
                ping,
            }
        })
        const result = await Promise.all(promises)
        console.log('Done pinging nodes')
        return result
    }
}
