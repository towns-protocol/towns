import { client, v2 } from '@datadog/datadog-api-client'
import { RiverNodeWalletBalance } from './wallet-balance'
import { RiverNodePingResults } from './pinger'
import { NodeMetrics, UsageMetrics } from './metrics-extractor'
import { CombinedNode, CombinedOperator } from './metrics-integrator'
import {
    GAUGE,
    COUNT,
} from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v2/models/MetricIntakeType'

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
        await Promise.all([
            this.postAggregateUsageTotals(metrics.usageTotals),
            this.postSpaceMembershipStatsSummary(metrics.spaceMembershipStats.statsSummary),
            this.postSpaceMembershipQuantiles(metrics.spaceMembershipStats.quantiles),
            this.postSpaceMembershipHistogram(metrics.spaceMembershipStats.histogram),
            this.postUserMembershipStatsSummary(metrics.userMembershipStats.statsSummary),
            this.postUserMembershipQuantiles(metrics.userMembershipStats.quantiles),
            this.postUserMembershipHistogram(metrics.userMembershipStats.histogram),
        ])
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

            return {
                type: COUNT,
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

            return {
                type: COUNT,
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
                        type: COUNT,
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
                type: COUNT,
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
            const tags = [
                `env:${this.env}`,
                `operator_address:${operator.operatorAddress}`,
                `status:${operator.baseOperatorStatus}`,
            ]
            return {
                type: COUNT,
                metric: `node_operator.base_status`,
                points: [{ timestamp: this.timestamp, value: 1 }],
                tags,
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    private async postRiverOperatorStatus(operators: CombinedOperator[]) {
        console.log('Posting river operator status to Datadog:')

        const series: v2.MetricSeries[] = operators.map((operator) => {
            const tags = [
                `env:${this.env}`,
                `operator_address:${operator.operatorAddress}`,
                `status:${operator.riverOperatorStatus}`,
            ]

            return {
                type: COUNT,
                metric: `node_operator.river_status`,
                points: [{ timestamp: this.timestamp, value: 1 }],
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

    private async postSpaceMembershipHistogram(
        histogram: UsageMetrics['spaceMembershipStats']['histogram'],
    ) {
        console.log('Posting aggregate usage stats to Datadog:')

        const histogramSeries: v2.MetricSeries[] = histogram.map((bin) => {
            return {
                type: GAUGE,
                metric: `river_network.total_space_memberships_histogram`,
                points: [{ timestamp: this.timestamp, value: bin.size }],
                tags: [`env:${this.env}`, `from:${bin.from}`, `to:${bin.to}`],
            }
        })

        console.log('Series:', JSON.stringify(histogramSeries, null, 2))
        return this.postSeries(histogramSeries)
    }

    private async postSpaceMembershipQuantiles(
        quantiles: UsageMetrics['spaceMembershipStats']['quantiles'],
    ) {
        console.log('Posting aggregate usage stats to Datadog:')

        const quantileSeries: v2.MetricSeries[] = Object.entries(quantiles).map(
            ([quantile, value]) => {
                return {
                    type: GAUGE,
                    metric: `river_network.space_membership_quantile`,
                    points: [{ timestamp: this.timestamp, value }],
                    tags: [`env:${this.env}`, `quantile:${quantile}`],
                }
            },
        )

        console.log('Series:', JSON.stringify(quantileSeries, null, 2))
        return this.postSeries(quantileSeries)
    }

    private async postSpaceMembershipStatsSummary(
        summary: UsageMetrics['spaceMembershipStats']['statsSummary'],
    ) {
        console.log('Posting aggregate usage stats to Datadog:')

        const series: v2.MetricSeries[] = Object.entries(summary).map(([name, value]) => {
            return {
                type: GAUGE,
                metric: `river_network.space_membership_summary`,
                points: [{ timestamp: this.timestamp, value }],
                tags: [`env:${this.env}`, `summary:${name}`],
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    private async postUserMembershipHistogram(
        histogram: UsageMetrics['userMembershipStats']['histogram'],
    ) {
        console.log('Posting aggregate usage stats to Datadog:')

        const histogramSeries: v2.MetricSeries[] = histogram.map((bin) => {
            return {
                type: GAUGE,
                metric: `river_network.total_user_memberships_histogram`,
                points: [{ timestamp: this.timestamp, value: bin.size }],
                tags: [`env:${this.env}`, `from:${bin.from}`, `to:${bin.to}`],
            }
        })

        console.log('Series:', JSON.stringify(histogramSeries, null, 2))
        return this.postSeries(histogramSeries)
    }

    private async postUserMembershipQuantiles(
        quantiles: UsageMetrics['spaceMembershipStats']['quantiles'],
    ) {
        console.log('Posting aggregate usage stats to Datadog:')

        const quantileSeries: v2.MetricSeries[] = Object.entries(quantiles).map(
            ([quantile, value]) => {
                return {
                    type: GAUGE,
                    metric: `river_network.user_membership_quantile`,
                    points: [{ timestamp: this.timestamp, value }],
                    tags: [`env:${this.env}`, `quantile:${quantile}`],
                }
            },
        )

        console.log('Series:', JSON.stringify(quantileSeries, null, 2))
        return this.postSeries(quantileSeries)
    }

    private async postUserMembershipStatsSummary(
        summary: UsageMetrics['spaceMembershipStats']['statsSummary'],
    ) {
        console.log('Posting aggregate usage stats to Datadog:')

        const series: v2.MetricSeries[] = Object.entries(summary).map(([name, value]) => {
            return {
                type: GAUGE,
                metric: `river_network.user_membership_summary`,
                points: [{ timestamp: this.timestamp, value }],
                tags: [`env:${this.env}`, `summary:${name}`],
            }
        })

        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }

    private async postAggregateUsageTotals(totals: {
        numTotalSpaces: number
        numTotalStreams: number
        numTotalSpaceMemberships: number
        numTotalUniqueSpaceMembers: number
        numTotalPricedSpaces: number
        numTotalPaidSpaceMemberships: number
        numTotalSpacesWithPaidMemberships: number
        // numUniqueSpaceOwners: number
    }) {
        console.log('Posting aggregate network stats to Datadog:')
        const metrics = [
            {
                name: 'river_network.total_spaces',
                value: totals.numTotalSpaces,
            },
            {
                name: 'river_network.total_streams',
                value: totals.numTotalStreams,
            },
            {
                name: 'river_network.total_space_memberships',
                value: totals.numTotalSpaceMemberships,
            },
            {
                name: 'river_network.total_unique_space_members',
                value: totals.numTotalUniqueSpaceMembers,
            },
            {
                name: 'river_network.total_priced_spaces',
                value: totals.numTotalPricedSpaces,
            },
            {
                name: 'river_network.total_paid_space_memberships',
                value: totals.numTotalPaidSpaceMemberships,
            },
            {
                name: 'river_network.total_spaces_with_paid_memberships',
                value: totals.numTotalSpacesWithPaidMemberships,
            },
            // {
            //     name: 'river_network.total_unique_space_owners',
            //     value: stats.numUniqueSpaceOwners,
            // },
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
