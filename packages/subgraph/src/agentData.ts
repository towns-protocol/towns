import axios from 'axios'

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
    if (!uri.startsWith('https://')) return null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get<AgentData>(uri, { timeout: 5000 })
            if (response.status !== 200) {
                console.warn(`Warning: Received status ${response.status} from ${uri}`)
            }
            return response.data
        } catch (error) {
            if (attempt < maxRetries) {
                console.warn(
                    `Fetch attempt ${attempt} failed for ${uri}, retrying in ${retryDelayMs}ms...`,
                )
                await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
            } else {
                console.error(`All ${maxRetries} fetch attempts failed for ${uri}`)
            }
        }
    }

    return null
}
