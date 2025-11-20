import axios from 'axios'
import { AgentData } from './agentData'

/**
 * Convert hex string to base64 (for gRPC bytes fields)
 */
function hexToBase64(hex: string): string {
    const hexString = hex.startsWith('0x') ? hex.slice(2) : hex
    return Buffer.from(hexString, 'hex').toString('base64')
}

/**
 * Get the App Registry service URL for the given environment
 */
function getAppRegistryUrl(environment: string): string {
    switch (environment) {
        case 'local_dev':
        case 'development':
            return 'https://localhost:6170'
        case 'test':
            return 'https://localhost:6170'
        case 'alpha':
            return 'https://app-registry.alpha.towns.com'
        case 'beta':
            return 'https://app-registry.beta.towns.com'
        case 'gamma':
        case 'test-beta':
            return 'https://app-registry.gamma.towns.com'
        case 'omega':
            return 'https://app-registry.omega.towns.com'
        case 'delta':
            return 'https://app-registry.delta.towns.com'
        default:
            console.warn(`[AppRegistry] No app registry url for environment ${environment}`)
            return ''
    }
}

/**
 * Fetch bot metadata from the App Registry service
 * Uses gRPC-web protocol to communicate with the service
 * See harmony/servers/workers/gateway-worker/src/bots/fetchBotMetadata.ts
 */
async function fetchBotMetadata(
    clientAddress: string,
    environment: string,
): Promise<{
    username?: string
    displayName?: string
    imageUrl?: string
    avatarUrl?: string
    motto?: string
    description?: string
    externalUrl?: string
} | null> {
    try {
        const appRegistryUrl = getAppRegistryUrl(environment)
        if (!appRegistryUrl) {
            return null
        }

        // Convert hex address to base64 for gRPC bytes field
        const appIdBase64 = hexToBase64(clientAddress)

        // Create the request body for GetAppMetadata
        // Using JSON format for gRPC-web (bytes must be base64 encoded)
        const requestBody = {
            appId: appIdBase64,
        }

        const response = await axios.post<{
            metadata?: {
                username?: string
                displayName?: string
                imageUrl?: string
                avatarUrl?: string
                motto?: string
                description?: string
                externalUrl?: string
            }
        }>(`${appRegistryUrl}/river.AppRegistryService/GetAppMetadata`, requestBody, {
            headers: {
                'Content-Type': 'application/json',
            },
        })

        const data = response.data

        if (!data.metadata) {
            console.warn(`[AppRegistry] No metadata in response for app=${clientAddress}`)
            return null
        }

        return data.metadata
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status
            console.error(
                `[AppRegistry] Failed to fetch metadata: ` +
                    `app=${clientAddress}, status=${status || 'unknown'}, message="${error.message}"`,
            )
        } else {
            console.error(
                `[AppRegistry] Error fetching metadata for app=${clientAddress}:`,
                error instanceof Error ? error.message : String(error),
            )
        }
        return null
    }
}

/**
 * Convert App Registry metadata to AgentData format (EIP-8004 compliant)
 * Maps gateway-worker's BotMetadata structure to subgraph's AgentData type
 */
function convertToAgentData(metadata: {
    username?: string
    displayName?: string
    imageUrl?: string
    avatarUrl?: string
    motto?: string
    description?: string
    externalUrl?: string
}): AgentData {
    return {
        type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
        name: metadata.displayName || metadata.username,
        description: metadata.description,
        image: metadata.avatarUrl || metadata.imageUrl,
        // Note: App Registry doesn't provide endpoints/registrations/supportedTrust
        // These fields will be undefined, which is valid for optional fields
    }
}

/**
 * Fetch agent data from App Registry service as fallback
 * This is called when HTTP fetch of agentUri fails after all retries
 */
export async function fetchAgentDataFromAppRegistry(
    appAddress: string,
    environment: string,
): Promise<AgentData | null> {
    console.info(
        `[AppRegistry] Attempting fallback fetch: app=${appAddress}, environment=${environment}`,
    )

    const metadata = await fetchBotMetadata(appAddress, environment)

    if (!metadata) {
        console.warn(`[AppRegistry] Fallback fetch failed: app=${appAddress}`)
        return null
    }

    const agentData = convertToAgentData(metadata)
    console.info(
        `[AppRegistry] Fallback fetch succeeded: app=${appAddress}, name=${agentData.name}`,
    )

    return agentData
}
