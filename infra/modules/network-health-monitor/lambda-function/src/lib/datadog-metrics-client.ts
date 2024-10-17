import { client, v2 } from '@datadog/datadog-api-client'
import { RiverNodeWalletBalance } from './wallet-balance'
import { RiverNodePingResults } from './pinger'
import { NodeStructOutput } from '@river-build/generated/dev/typings/INodeRegistry'
import { NodeMetrics, UsageMetrics } from './metrics-extractor'
import { CombinedNode, CombinedOperator } from './metrics-integrator'
import { GAUGE } from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v2/models/MetricIntakeType'

export class DatadogMetricsClient {
    private readonly apiKey: string
    private readonly appKey: string
    private readonly env: string
    private readonly timestamp: number

    constructor(params: { apiKey: string; appKey: string; env: string }) {
        this.apiKey = params.apiKey
        this.appKey = params.appKey
        this.env = params.env
        this.timestamp = Math.floor(Date.now() / 1000)
    }

    private async postSeries(series: Array<v2.MetricSeries>) {
        const configuration = client.createConfiguration({
            authMethods: {
                apiKeyAuth: this.apiKey,
                appKeyAuth: this.appKey,
            },
        })

        return new v2.MetricsApi(configuration)
            .submitMetrics({
                body: {
                    series,
                },
            })
            .then((data: v2.IntakePayloadAccepted) => {
                console.log('API called successfully. Returned data: ' + JSON.stringify(data))
            })
            .catch((error: any) => {
                console.error(error)
                throw error
            })
    }

    public async postNodeMetrics(metrics: NodeMetrics) {
        const {
            aggregateNodeStats,
            nodePingResults,
            walletBalances,
            combinedNodes,
            combinedOperators,
        } = metrics
        await Promise.all([
            this.postWalletBalances(walletBalances),
            this.postNodeStatusOnBase(combinedNodes),
            this.postNodeStatusOnRiver(combinedNodes),
            this.postNodePingResults(nodePingResults),
            this.postNodeChainStatusMetrics(nodePingResults),
            this.postBaseOperatorStatus(combinedOperators),
            this.postRiverOperatorStatus(combinedOperators),
            this.postAggregateNodeStats(aggregateNodeStats),
        ])
    }

    public async postUsageMetrics(metrics: UsageMetrics) {
        await this.postAggregateUsageStats(metrics.aggregateUsageStats)
    }

    private async postWalletBalances(walletBalances: RiverNodeWalletBalance[]) {
        console.log('Posting wallet balances to Datadog:')

        const series: v2.MetricSeries[] = walletBalances.map(({ node, balance, chain }) => {
            const walletAddress = node.nodeAddress
            const tags = [
                `env:${this.env}`,
                `wallet_address:${walletAddress}`,
                `operator_address:${node.operator}`,
                `node_url:${encodeURI(node.url)}`,
                `chain:${chain}`,
            ]
            return {
                type: GAUGE,
                metric: `river_node.wallet_balance`,
                points: [{ timestamp: this.timestamp, value: balance }],
                tags,
            }
        })
        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    private async postNodeStatusOnRiver(nodes: CombinedNode[]) {
        console.log('Posting river status to Datadog:')

        const series: v2.MetricSeries[] = nodes.map((node) => {
            const nodeUrl = typeof node.url === 'string' ? node.url : 'unknown'
            const isMissing = node.isMissingOnRiver ? 'true' : 'false'
            const tags = [
                `env:${this.env}`,
                `wallet_address:${node.nodeAddress}`,
                `operator_address:${node.riverOperator}`,
                `node_url:${encodeURI(nodeUrl)}`,
                `is_missing:${isMissing}`,
            ]

            // TODO: consider adding additional tags for the node status, such as "not initialized",
            // remote_only, operational, failed etc.

            return {
                type: GAUGE,
                metric: `river_node.river_status`,
                points: [{ timestamp: this.timestamp, value: node.riverStatus }],
                tags,
            }
        })
        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    private async postNodeStatusOnBase(nodes: CombinedNode[]) {
        console.log('Posting base status to Datadog:')

        const series: v2.MetricSeries[] = nodes.map((node) => {
            const nodeUrl = typeof node.url === 'string' ? node.url : 'unknown'
            const isMissing = node.isMissingOnBase ? 'true' : 'false'
            const tags = [
                `env:${this.env}`,
                `wallet_address:${node.nodeAddress}`,
                `operator_address:${node.baseOperator}`,
                `node_url:${encodeURI(nodeUrl)}`,
                `is_missing:${isMissing}`,
            ]

            // TODO: consider adding additional tags for the node status, such as "not initialized",
            // remote_only, operational, failed etc.

            return {
                type: GAUGE,
                metric: `river_node.base_status`,
                points: [{ timestamp: this.timestamp, value: node.baseStatus }],
                tags,
            }
        })
        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    private async postNodeChainStatusMetrics(pingNodeResults: RiverNodePingResults) {
        const series: v2.MetricSeries[] = []
        pingNodeResults.forEach(({ ping, node }) => {
            const nodeUrl = typeof node.url === 'string' ? node.url : 'unknown'
            if (ping.result === 'success') {
                const tags = [
                    `env:${this.env}`,
                    `wallet_address:${node.nodeAddress}`,
                    `node_url:${encodeURI(nodeUrl)}`,
                    `version:${ping.response.version}`,
                ]

                const allChains = [
                    ping.response.base,
                    ping.response.river,
                    ...ping.response.other_chains,
                ]

                allChains.forEach((chain) => {
                    const currentTags = [
                        ...tags,
                        `chain_id:${chain.chain_id}`,
                        `status:${chain.result}`,
                    ]
                    // remove 'ms' from the end of the string
                    const latency = parseInt(chain.latency.slice(0, -2))
                    series.push({
                        type: GAUGE,
                        metric: `river_node.chain.status`,
                        points: [{ timestamp: this.timestamp, value: 1 }],
                        tags: currentTags,
                    })

                    series.push({
                        type: GAUGE,
                        metric: `river_node.chain.latency`,
                        points: [{ timestamp: this.timestamp, value: latency }],
                        tags: currentTags,
                    })

                    series.push({
                        type: GAUGE,
                        metric: `river_node.chain.latest_block_number`,
                        points: [{ timestamp: this.timestamp, value: chain.block }],
                        tags: currentTags,
                    })
                })
            }
        })
        return this.postSeries(series)
    }

    private async postNodePingResults(pingNodeResults: RiverNodePingResults) {
        console.log('Posting node ping results to Datadog:')

        const series: v2.MetricSeries[] = pingNodeResults.map(({ ping, node }) => {
            const nodeUrl = typeof node.url === 'string' ? node.url : 'unknown'
            const tags = [
                `env:${this.env}`,
                `wallet_address:${node.nodeAddress}`,
                `river_operator_address:${node.riverOperator}`,
                `base_operator_address:${node.baseOperator}`,
                `node_url:${encodeURI(nodeUrl)}`,
                `result:${ping.result}`,
            ]

            if (ping.response) {
                tags.push(`version:${ping.response.version}`)
                tags.push(`status:${ping.response.status}`)
            }

            return {
                type: GAUGE,
                metric: `river_node.ping`,
                points: [{ timestamp: this.timestamp, value: 1 }],
                tags,
            }
        })
        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    private async postBaseOperatorStatus(operators: CombinedOperator[]) {
        console.log('Posting base operator status to Datadog:')

        const series: v2.MetricSeries[] = operators.map((operator) => {
            const tags = [`env:${this.env}`, `operator_address:${operator.operatorAddress}`]

            return {
                type: GAUGE,
                metric: `node_operator.base_status`,
                points: [{ timestamp: this.timestamp, value: operator.baseOperatorStatus }],
                tags,
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    private async postRiverOperatorStatus(operators: CombinedOperator[]) {
        console.log('Posting river operator status to Datadog:')

        const series: v2.MetricSeries[] = operators.map((operator) => {
            const tags = [`env:${this.env}`, `operator_address:${operator.operatorAddress}`]

            return {
                type: GAUGE,
                metric: `node_operator.river_status`,
                points: [{ timestamp: this.timestamp, value: operator.riverOperatorStatus }],
                tags,
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    private async postAggregateNodeStats(stats: {
        numTotalNodesOnBase: number
        numTotalNodesOnRiver: number
        numTotalOperatorsOnBase: number
        numTotalOperatorsOnRiver: number
        numMissingNodesOnBase: number
        numMissingNodesOnRiver: number
    }) {
        console.log('Posting aggregate node stats to Datadog:')
        const metrics = [
            {
                name: 'river_network.total_nodes_on_base',
                value: stats.numTotalNodesOnBase,
            },
            {
                name: 'river_network.total_nodes_on_river',
                value: stats.numTotalNodesOnRiver,
            },
            {
                name: 'river_network.total_operators_on_base',
                value: stats.numTotalOperatorsOnBase,
            },
            {
                name: 'river_network.total_operators_on_river',
                value: stats.numTotalOperatorsOnRiver,
            },
            {
                name: 'river_network.total_missing_nodes_on_base',
                value: stats.numMissingNodesOnBase,
            },
            {
                name: 'river_network.total_missing_nodes_on_river',
                value: stats.numMissingNodesOnRiver,
            },
        ]

        const series: v2.MetricSeries[] = metrics.map(({ name, value }) => {
            return {
                type: GAUGE,
                metric: name,
                points: [{ timestamp: this.timestamp, value }],
                tags: [`env:${this.env}`],
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    private async postAggregateUsageStats(stats: {
        numTotalSpaces: number
        numTotalStreams: number
        numTotalSpaceMemberships: number
        numTotalUniqueSpaceMembers: number
        numTotalPricedSpaces: number
        numTotalPaidSpaceMemberships: number
        numTotalSpacesWithPaidMemberships: number
        numUniqueSpaceOwners: number
    }) {
        console.log('Posting aggregate network stats to Datadog:')
        const metrics = [
            {
                name: 'river_network.total_spaces',
                value: stats.numTotalSpaces,
            },
            {
                name: 'river_network.total_streams',
                value: stats.numTotalStreams,
            },
            {
                name: 'river_network.total_space_memberships',
                value: stats.numTotalSpaceMemberships,
            },
            {
                name: 'river_network.total_unique_space_members',
                value: stats.numTotalUniqueSpaceMembers,
            },
            {
                name: 'river_network.total_priced_spaces',
                value: stats.numTotalPricedSpaces,
            },
            {
                name: 'river_network.total_paid_space_memberships',
                value: stats.numTotalPaidSpaceMemberships,
            },
            {
                name: 'river_network.total_spaces_with_paid_memberships',
                value: stats.numTotalSpacesWithPaidMemberships,
            },
            {
                name: 'river_network.total_unique_space_owners',
                value: stats.numUniqueSpaceOwners,
            },
        ]

        const series: v2.MetricSeries[] = metrics.map(({ name, value }) => {
            return {
                type: GAUGE,
                metric: name,
                points: [{ timestamp: this.timestamp, value }],
                tags: [`env:${this.env}`],
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }
}
