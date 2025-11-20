import { fetchJson } from './httpClient'

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
): Promise<AgentData | null> {
    if (!uri.startsWith('https://')) {
        console.warn(`[AgentData] Skipping non-HTTPS URI: ${uri}`)
        return null
    }

    return fetchJson<AgentData>(uri, {
        maxRetries,
        retryDelayMs,
        logPrefix: '[AgentData]',
    })
}
