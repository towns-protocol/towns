import { client, v2 } from '@datadog/datadog-api-client'
import { MetricSeries } from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v2'
import { RiverNodeWalletBalance } from './wallet-balance'
import { RiverNodePingResults } from './pinger'
import { NodeStructOutput } from '@river-build/generated/dev/typings/INodeRegistry'
import { RiverMetrics } from './metrics-extractor'
import { CombinedNode, CombinedOperator } from './metrics-integrator'

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

    private async postSeries(series: Array<MetricSeries>) {
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

    public async postAllMetrics(riverMetrics: RiverMetrics) {
        const {
            aggregateNetworkStats,
            nodePingResults,
            // nodesOnRiverWithStreamCounts,
            walletBalances,
            combinedNodes,
            combinedOperators,
        } = riverMetrics
        await Promise.all([
            this.postWalletBalances(walletBalances),
            this.postNodeStatusOnBase(combinedNodes),
            this.postNodeStatusOnRiver(combinedNodes),
            this.postNodePingResults(nodePingResults),
            // TODO: uncomment to post stream counts
            // await datadog.postNodeStreamCounts(nodesOnRiverWithStreamCounts)
            this.postBaseOperatorStatus(combinedOperators),
            this.postRiverOperatorStatus(combinedOperators),
            this.postAggregateNetworkStats(aggregateNetworkStats),
        ])
    }

    public async postWalletBalances(walletBalances: RiverNodeWalletBalance[]) {
        console.log('Posting wallet balances to Datadog:')

        const series = walletBalances.map(({ node, balance, chain }) => {
            const walletAddress = node.nodeAddress
            const tags = [
                `env:${this.env}`,
                `wallet_address:${walletAddress}`,
                `operator_address:${node.operator}`,
                `node_url:${encodeURI(node.url)}`,
                `chain:${chain}`,
            ]
            return {
                metric: `river_node.wallet_balance`,
                points: [{ timestamp: this.timestamp, value: balance }],
                tags,
            }
        })
        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    public async postNodeStatusOnRiver(nodes: CombinedNode[]) {
        console.log('Posting river status to Datadog:')

        const series = nodes.map((node) => {
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
                metric: `river_node.river_status`,
                points: [{ timestamp: this.timestamp, value: node.riverStatus }],
                tags,
            }
        })
        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    public async postNodeStatusOnBase(nodes: CombinedNode[]) {
        console.log('Posting base status to Datadog:')

        const series = nodes.map((node) => {
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
                metric: `river_node.base_status`,
                points: [{ timestamp: this.timestamp, value: node.baseStatus }],
                tags,
            }
        })
        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    public async postNodeStreamCounts(
        nodeStreamCounts: { node: NodeStructOutput; streamCount: number }[],
    ) {
        console.log('Posting node stream counts to Datadog:')

        const series = nodeStreamCounts.map(({ streamCount, node }) => {
            const tags = [
                `env:${this.env}`,
                `wallet_address:${node.nodeAddress}`,
                `operator_address:${node.operator}`,
                `node_url:${encodeURI(node.url)}`,
            ]

            return {
                metric: `river_node.stream_count`,
                points: [{ timestamp: this.timestamp, value: streamCount }],
                tags,
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    public async postNodePingResults(pingNodeResults: RiverNodePingResults) {
        console.log('Posting node ping results to Datadog:')

        const series = pingNodeResults.map(({ ping, node }) => {
            const nodeUrl = typeof node.url === 'string' ? node.url : 'unknown'
            const tags = [
                `env:${this.env}`,
                `wallet_address:${node.nodeAddress}`,
                `river_operator_address:${node.riverOperator}`,
                `base_operator_address:${node.baseOperator}`,
                `node_url:${encodeURI(nodeUrl)}`,
            ]

            const value = ping.kind === 'success' ? 1 : 0

            if (ping.kind === 'success') {
                tags.push(`status:${ping.response.status}`)
                tags.push(`version:${ping.response.version}`)
                tags.push(`success:true`)
            } else {
                tags.push(`success:false`)
            }

            return {
                metric: `river_node.ping`,
                points: [{ timestamp: this.timestamp, value }],
                tags,
            }
        })
        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    public async postBaseOperatorStatus(operators: CombinedOperator[]) {
        console.log('Posting base operator status to Datadog:')

        const series = operators.map((operator) => {
            const tags = [`env:${this.env}`, `operator_address:${operator.operatorAddress}`]

            return {
                metric: `node_operator.base_status`,
                points: [{ timestamp: this.timestamp, value: operator.baseOperatorStatus }],
                tags,
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    public async postRiverOperatorStatus(operators: CombinedOperator[]) {
        console.log('Posting river operator status to Datadog:')

        const series = operators.map((operator) => {
            const tags = [`env:${this.env}`, `operator_address:${operator.operatorAddress}`]

            return {
                metric: `node_operator.river_status`,
                points: [{ timestamp: this.timestamp, value: operator.riverOperatorStatus }],
                tags,
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    public async postAggregateNetworkStats(stats: {
        numTotalSpaces: number
        numTotalNodesOnBase: number
        numTotalNodesOnRiver: number
        numTotalOperatorsOnBase: number
        numTotalOperatorsOnRiver: number
        numTotalStreams: number
        numMissingNodesOnBase: number
        numMissingNodesOnRiver: number
        numUnhealthyPings: number
        numTotalSpaceMemberships: number
    }) {
        console.log('Posting aggregate network stats to Datadog:')
        const metrics = [
            {
                name: 'river_network.total_spaces',
                value: stats.numTotalSpaces,
            },
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
                name: 'river_network.total_streams',
                value: stats.numTotalStreams,
            },
            {
                name: 'river_network.total_missing_nodes_on_base',
                value: stats.numMissingNodesOnBase,
            },
            {
                name: 'river_network.total_missing_nodes_on_river',
                value: stats.numMissingNodesOnRiver,
            },
            {
                name: 'river_network.total_unhealthy_pings',
                value: stats.numUnhealthyPings,
            },
            {
                name: 'river_network.total_space_memberships',
                value: stats.numTotalSpaceMemberships,
            },
        ]

        const series = metrics.map(({ name, value }) => {
            return {
                metric: name,
                points: [{ timestamp: this.timestamp, value }],
                tags: [`env:${this.env}`],
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }
}
