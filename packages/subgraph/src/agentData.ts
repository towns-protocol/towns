import { fetchJson } from './httpClient'
import { fetchAgentDataFromAppRegistry } from './appRegistryFallback'

export type AgentData = {
    type?: string
    name?: string
    description?: string
    image?: string
    endpoints?: Array<{
        name?: string
        endpoint?: string
        version?: string
    }>
    registrations?: Array<{
        agentId?: number
        agentRegistry?: string
    }>
    supportedTrust?: string[]
}

export async function fetchAgentData(
    uri: string,
    maxRetries: number = 3,
    retryDelayMs: number = 1000,
    appAddress?: string,
    environment?: string,
): Promise<AgentData | null> {
    if (!uri.startsWith('https://')) {
        console.warn(`[AgentData] Skipping non-HTTPS URI: ${uri}`)
        return null
    }

    // Try HTTP fetch with retries
    const httpResult = await fetchJson<AgentData>(uri, {
        maxRetries,
        retryDelayMs,
        logPrefix: '[AgentData]',
    })

    // If HTTP succeeds, return immediately
    if (httpResult) {
        return httpResult
    }

    // Fallback: Try App Registry if we have the necessary parameters
    if (appAddress && environment) {
        console.warn(
            `[AgentData] HTTP fetch exhausted all retries, trying App Registry fallback: ` +
                `uri=${uri}, app=${appAddress}`,
        )
        return fetchAgentDataFromAppRegistry(appAddress, environment)
    }

    // No fallback possible
    return null
}
