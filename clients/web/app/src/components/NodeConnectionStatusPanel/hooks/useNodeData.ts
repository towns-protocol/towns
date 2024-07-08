import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { z } from 'zod'
import { Color } from 'three'
import { createRiverRegistry, useTownsContext } from 'use-towns-client'
import { dlogger } from '@river-build/dlog'
import { SECOND_MS } from 'data/constants'

const logger = dlogger('useNodeData')

export const NODE_COLORS = [
    '#1DDCF2',
    '#AFDD79',
    '#FED83D',
    '#C740F2',
    '#9558FA',
    '#FEA56F',
    '#FF60B2',
    '#FEA56F',
    '#DBDE54',
]

export type NodeData = {
    id: string
    index: number
    nodeUrl: string
    statusText: string
    status: number

    operator: string
    operatorAddress: string
    operatorIndex: number
    data: Partial<NodeStatusSchema['nodes'][0]>
    color: Color
    operatorColor: Color
}

export const useNodeData = (connectedNode: string | undefined) => {
    const { riverProvider, riverConfig } = useTownsContext()

    const { data } = useQuery<NodeStatusSchema>({
        queryKey: ['nodeStatus'],
        queryFn: async () => {
            const fetchNodeData = async (url: string) => {
                const res = await fetch(url + '/debug/multi/json')
                if (!res.ok) {
                    throw new Error(`Failed to fetch from ${url}`)
                }
                return res.json()
            }

            // Try connected node first if provided
            if (connectedNode) {
                try {
                    return await fetchNodeData(connectedNode)
                } catch (error) {
                    logger.error(
                        `Failed to fetch from connected node ${connectedNode}, trying random nodes`,
                    )
                }
            }

            const riverRegistry = createRiverRegistry(riverProvider, riverConfig)
            // Get operational nodes only if needed
            const urls = (await riverRegistry.getOperationalNodeUrls()).split(',')

            // Remove connected node from the array if present
            if (connectedNode) {
                const connectedNodeIndex = urls.indexOf(connectedNode)
                if (connectedNodeIndex > -1) {
                    urls.splice(connectedNodeIndex, 1)
                }
            }

            // Try up to 5 random nodes
            for (let attempt = 0; attempt < 5 && urls.length > 0; attempt++) {
                const randomIndex = Math.floor(Math.random() * urls.length)
                const randomUrl = urls[randomIndex]

                // Remove the attempted URL from the array
                urls.splice(randomIndex, 1)

                try {
                    return await fetchNodeData(randomUrl)
                } catch (error) {
                    logger.error(`Failed to fetch from ${randomUrl}, attempt ${attempt + 1} of 5`)
                }
            }
            logger.error('All fetch attempts failed')

            throw new Error('All fetch attempts failed')
        },
        refetchInterval: SECOND_MS * 30,
    })

    const nodeConnections = useMemo(() => {
        const operators = new Set<string>()
        return (
            data?.nodes.map((n, i) => {
                operators.add(n.record.operator)
                const operatorIndex = Array.from(operators.values()).indexOf(n.record.operator)
                return {
                    id: n.record.url,
                    index: i,
                    nodeUrl: n.record.url,
                    statusText: n.record.status_text,
                    status: n.record.status,
                    operatorAddress: n.record.address,
                    operator: n.record.operator,
                    operatorIndex,
                    data: n,
                    color: new Color(
                        NODE_COLORS[
                            Math.floor((i * NODE_COLORS.length) / data.nodes.length) %
                                NODE_COLORS.length
                        ],
                    ),
                    operatorColor: new Color(NODE_COLORS[(3 + operatorIndex) % NODE_COLORS.length]),
                } satisfies NodeData
            }) ?? []
        ).sort((a) => (a.nodeUrl === connectedNode ? -1 : 1))
    }, [connectedNode, data?.nodes])

    return nodeConnections
}

export const toNodeDataArray = (nodes: NodeStatusSchema['nodes']) => {}

export type NodeStatusSchema = z.infer<typeof nodeStatusSchema>

export const nodeStatusSchema = z.object({
    nodes: z.array(
        z.union([
            z.object({
                record: z.object({
                    address: z.string(),
                    url: z.string(),
                    operator: z.string(),
                    status: z.number(),
                    status_text: z.string(),
                }),
                http11: z.object({
                    success: z.boolean(),
                    status: z.number(),
                    status_text: z.string(),
                    elapsed: z.string(),
                    elapsed_after_dns: z.string(),
                    elapsed_after_conn: z.string(),
                    response: z.object({
                        status: z.string(),
                        instance_id: z.string(),
                        address: z.string(),
                        version: z.string(),
                        start_time: z.string(),
                        uptime: z.string(),
                        graffiti: z.string(),
                    }),
                    protocol: z.string(),
                    used_tls: z.boolean(),
                    remote_address: z.string(),
                    dns_addresses: z.array(z.string()),
                }),
                http20: z.object({
                    success: z.boolean(),
                    status: z.number(),
                    status_text: z.string(),
                    elapsed: z.string(),
                    elapsed_after_dns: z.string(),
                    elapsed_after_conn: z.string(),
                    response: z.object({
                        status: z.string(),
                        instance_id: z.string(),
                        address: z.string(),
                        version: z.string(),
                        start_time: z.string(),
                        uptime: z.string(),
                        graffiti: z.string(),
                    }),
                    protocol: z.string(),
                    used_tls: z.boolean(),
                    remote_address: z.string(),
                    dns_addresses: z.array(z.string()),
                }),
                grpc: z.object({
                    success: z.boolean(),
                    status_text: z.string(),
                    elapsed: z.string(),
                    elapsed_after_dns: z.string(),
                    elapsed_after_conn: z.string(),
                    version: z.string(),
                    start_time: z.string(),
                    uptime: z.string(),
                    graffiti: z.string(),
                    protocol: z.string(),
                    x_http_version: z.string(),
                    remote_address: z.string(),
                    dns_addresses: z.array(z.string()),
                }),
                river_eth_balance: z.string(),
            }),
            z.object({
                record: z.object({
                    address: z.string(),
                    url: z.string(),
                    operator: z.string(),
                    status: z.number(),
                    status_text: z.string(),
                }),
                local: z.boolean(),
                http11: z.object({
                    success: z.boolean(),
                    status: z.number(),
                    status_text: z.string(),
                    elapsed: z.string(),
                    elapsed_after_dns: z.string(),
                    elapsed_after_conn: z.string(),
                    response: z.object({
                        status: z.string(),
                        instance_id: z.string(),
                        address: z.string(),
                        version: z.string(),
                        start_time: z.string(),
                        uptime: z.string(),
                        graffiti: z.string(),
                    }),
                    protocol: z.string(),
                    used_tls: z.boolean(),
                    remote_address: z.string(),
                    dns_addresses: z.array(z.string()),
                }),
                http20: z.object({
                    success: z.boolean(),
                    status: z.number(),
                    status_text: z.string(),
                    elapsed: z.string(),
                    elapsed_after_dns: z.string(),
                    elapsed_after_conn: z.string(),
                    response: z.object({
                        status: z.string(),
                        instance_id: z.string(),
                        address: z.string(),
                        version: z.string(),
                        start_time: z.string(),
                        uptime: z.string(),
                        graffiti: z.string(),
                    }),
                    protocol: z.string(),
                    used_tls: z.boolean(),
                    remote_address: z.string(),
                    dns_addresses: z.array(z.string()),
                }),
                grpc: z.object({
                    success: z.boolean(),
                    status_text: z.string(),
                    elapsed: z.string(),
                    elapsed_after_dns: z.string(),
                    elapsed_after_conn: z.string(),
                    version: z.string(),
                    start_time: z.string(),
                    uptime: z.string(),
                    graffiti: z.string(),
                    protocol: z.string(),
                    x_http_version: z.string(),
                    remote_address: z.string(),
                    dns_addresses: z.array(z.string()),
                }),
                river_eth_balance: z.string(),
            }),
        ]),
    ),
    query_time: z.string(),
    elapsed: z.string(),
})
