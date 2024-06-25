import { client, v2 } from '@datadog/datadog-api-client'
import { MetricSeries } from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v2'
import { RiverNodeWalletBalance } from './wallet-balance'
import { RiverNodePingResults } from './ping'
import { NodeStructOutput } from '@river-build/generated/v3/typings/INodeRegistry'
import { BaseOperator } from '@river-build/web3'
import { RiverMetrics } from './get-metrics'

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
            nodesOnRiver,
            // nodesOnRiverWithStreamCounts,
            operatorsOnBase,
            operatorsOnRiver,
            walletBalances,
        } = riverMetrics
        await Promise.all([
            this.postWalletBalances(walletBalances),
            this.postNodeStatusList(nodesOnRiver),
            this.postNodePingResults(nodePingResults),
            // TODO: uncomment to post stream counts
            // await datadog.postNodeStreamCounts(nodesOnRiverWithStreamCounts)
            this.postBaseOperatorStatus(operatorsOnBase),
            this.postRiverOperatorStatus(operatorsOnRiver),
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

    public async postNodeStatusList(nodes: NodeStructOutput[]) {
        console.log('Posting node status list to Datadog:')

        const series = nodes.map((node) => {
            const tags = [
                `env:${this.env}`,
                `wallet_address:${node.nodeAddress}`,
                `operator_address:${node.operator}`,
                `node_url:${encodeURI(node.url)}`,
            ]

            // TODO: consider adding additional tags for the node status, such as "not initialized",
            // remote_only, operational, failed etc.

            return {
                metric: `river_node.status`,
                points: [{ timestamp: this.timestamp, value: node.status }],
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
            const tags = [
                `env:${this.env}`,
                `wallet_address:${node.nodeAddress}`,
                `operator_address:${node.operator}`,
                `node_url:${encodeURI(node.url)}`,
            ]

            const value = ping.kind === 'success' ? 1 : 0

            if (ping.kind === 'success') {
                tags.push(`status:${ping.response.status}`)
                tags.push(`version:${ping.response.version}`)
            }

            return {
                metric: `river_node.ping_success`,
                points: [{ timestamp: this.timestamp, value }],
                tags,
            }
        })
        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    public async postBaseOperatorStatus(baseOperators: BaseOperator[]) {
        console.log('Posting base operator status to Datadog:')

        const series = baseOperators.map((operator) => {
            const tags = [`env:${this.env}`, `operator_address:${operator.operatorAddress}`]

            return {
                metric: `base_operator.status`,
                points: [{ timestamp: this.timestamp, value: operator.status }],
                tags,
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    public async postRiverOperatorStatus(riverOperators: string[]) {
        console.log('Posting river operator status to Datadog:')

        const series = riverOperators.map((operatorAddress) => {
            const tags = [`env:${this.env}`, `operator_address:${operatorAddress}`]

            return {
                metric: `river_operator.status`,
                points: [{ timestamp: this.timestamp, value: 1 }],
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
