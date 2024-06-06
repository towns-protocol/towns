import { client, v2 } from '@datadog/datadog-api-client'
import { RiverNodeWalletBalance } from './river-node-wallet-balance'
import { MetricSeries } from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v2'
import { RiverNode } from './river-node'

export class DatadogMetrics {
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

    public async postNodeStatusList(nodeStatusList: RiverNode[]) {
        console.log('Posting node status list to Datadog:')

        const series = nodeStatusList.map((node) => {
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
}
