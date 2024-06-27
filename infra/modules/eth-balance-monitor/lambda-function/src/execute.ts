import { Config } from './config'
import { DatadogMetricsClient } from './datadog-metrics-client'
import { MetricsExtractor } from './metrics-extractor'

// This is the main internal execution logic for the lambda. We separete it to help with development and testing.
// It accepts a Config object, which the lambda puts together from environment variables and AWS Secrets Manager.

export async function execute(config: Config) {
    const { environment, datadogApiKey, datadogApplicationKey } = config
    const datadog = new DatadogMetricsClient({
        apiKey: datadogApiKey,
        appKey: datadogApplicationKey,
        env: environment,
    })
    const metricsExtractor = MetricsExtractor.init(config)
    const metrics = await metricsExtractor.extract()
    await datadog.postAllMetrics(metrics)
}
