import { z } from 'zod'
import { Unpromisify } from './utils'
import { NodeStructOutput } from '@river-build/generated/v3/typings/INodeRegistry'

const NodeStatusSchema = z.object({
    status: z.string(),
    instance_id: z.string(),
    address: z.string(),
    version: z.string(),
    start_time: z.string(),
    uptime: z.string(),
})

export type RiverNodePingResults = Unpromisify<ReturnType<Ping['pingNodes']>>

export class Ping {
    constructor(public readonly nodes: NodeStructOutput[]) {}

    private async pingNode(node: NodeStructOutput) {
        const url = new URL(node.url)
        url.pathname = '/status'

        let response: Response

        try {
            response = await fetch(url.toString())
        } catch (e: unknown) {
            console.error(`Failed to ping node ${node.url}: ${e}`)
            return {
                kind: 'error' as const,
                message: `Failed to ping node ${node.url}: ${e}`,
            }
        }

        if (response.status !== 200) {
            console.warn(`Node ${node.url} returned status ${response.status}`)
            return {
                kind: 'error' as const,
                message: `Node ${node.url} returned status ${response.status}`,
            }
        }

        let jsonResponse: unknown

        try {
            jsonResponse = await response.json()
        } catch (e: unknown) {
            console.error(`Failed to parse JSON response from node ${node.url}: ${e}`)
            return {
                kind: 'error' as const,
                message: `Failed to parse JSON response from node ${node.url}: ${e}`,
            }
        }

        const parsedResponse = NodeStatusSchema.safeParse(jsonResponse)

        if (!parsedResponse.success) {
            console.error(
                `Failed to validate JSON response from node ${node.url}: ${parsedResponse.error}`,
            )
            return {
                kind: 'error' as const,
                message: `Failed to validate JSON response from node ${node.url}: ${parsedResponse.error}`,
            }
        }

        return {
            kind: 'success' as const,
            response: parsedResponse.data,
        }
    }

    public async pingNodes() {
        const promises = this.nodes.map(async (node) => {
            const ping = await this.pingNode(node)
            return {
                node,
                ping,
            }
        })
        return await Promise.all(promises)
    }
}
