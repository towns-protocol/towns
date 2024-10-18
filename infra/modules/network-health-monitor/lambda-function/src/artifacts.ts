import { z } from 'zod'
import { MetricsArtifacts } from './lib/metrics-artifacts'
import { MetricsExtractor } from './lib/metrics-extractor'

const envSchema = z.object({
    BASE_CHAIN_RPC_URL: z.string().url(),
    RIVER_CHAIN_RPC_URL: z.string().url(),
    ENVIRONMENT: z.string(),
    GET_SPACE_INFO: z.boolean(),
})

// Fetches all metrics and prepares file artifacts for further analysis
const run = async () => {
    const env = envSchema.parse(process.env)

    const extractor = MetricsExtractor.init({
        baseChainRpcUrl: env.BASE_CHAIN_RPC_URL,
        riverChainRpcUrl: env.RIVER_CHAIN_RPC_URL,
        environment: env.ENVIRONMENT,
        getSpaceInfo: env.GET_SPACE_INFO,
    })

    const nodeMetrics = await extractor.extractNodeMetrics()
    const usageMetrics = await extractor.extractUsageMetrics()
    const artifacts = new MetricsArtifacts(nodeMetrics, usageMetrics)
    await artifacts.createArtifacts()
}

run()
