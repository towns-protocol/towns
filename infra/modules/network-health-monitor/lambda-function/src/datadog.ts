import { Config } from './config'
import { DatadogMetricsClient } from './lib/datadog-metrics-client'
import { MetricsExtractor } from './lib/metrics-extractor'

// This is the main internal execution logic for the lambda. We separete it to help with development and testing.
// It accepts a Config object, which the lambda puts together from environment variables and AWS Secrets Manager.

export async function handleDatadogJob(config: Config) {
    const { environment, datadogApiKey, datadogApplicationKey } = config
    const datadog = new DatadogMetricsClient({
        apiKey: datadogApiKey,
        appKey: datadogApplicationKey,
        env: environment,
    })
    const metricsExtractor = MetricsExtractor.init(config)
    if (config.extractedMetricsKind === 'usage') {
        const usageMetrics = await metricsExtractor.extractUsageMetrics()
        await datadog.postUsageMetrics(usageMetrics)
    } else if (config.extractedMetricsKind === 'node') {
        const nodeMetrics = await metricsExtractor.extractNodeMetrics()
        await datadog.postNodeMetrics(nodeMetrics)
    } else {
        throw new Error(`Unknown extracted metrics kind: ${config.extractedMetricsKind}`)
    }
}
