import { client, v2 } from '@datadog/datadog-api-client'
import { RiverNodeWalletBalance } from './river-node-wallet-balance'
import { MetricSeries } from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v2'

export class DatadogMetrics {
    private readonly apiKey: string
    private readonly appKey: string
    private readonly env: string

    constructor(params: { apiKey: string; appKey: string; env: string }) {
        this.apiKey = params.apiKey
        this.appKey = params.appKey
        this.env = params.env
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
        const timestamp = Math.floor(Date.now() / 1000)
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
                points: [{ timestamp, value: balance }],
                tags,
            }
        })
        console.log('Series:', JSON.stringify(series, null, 2))
        return this.postSeries(series)
    }
}
