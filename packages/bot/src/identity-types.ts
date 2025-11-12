export type ERC8004Endpoint = {
    name: string
    endpoint: string
    version?: string
    capabilities?: Record<string, any>
}

export type ERC8004Registration = {
    agentId: number | string
    agentRegistry: string
}

export type ERC8004TrustModel = 'reputation' | 'crypto-economic' | 'tee-attestation'

export type BotIdentityConfig = {
    name: string
    description: string
    image: string
    endpoints?: ERC8004Endpoint[]
    registrations?: ERC8004Registration[]
    supportedTrust?: ERC8004TrustModel[]
    motto?: string
    domain?: string
    attributes?: Array<{
        trait_type: string
        value: string | number
    }>
}

export type BotIdentityMetadata = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1'
    name: string
    description: string
    image: string
    endpoints: ERC8004Endpoint[]
    registrations: ERC8004Registration[]
    supportedTrust?: ERC8004TrustModel[]
    motto?: string
    capabilities?: string[]
    version?: string
    framework?: string
    attributes?: Array<{
        trait_type: string
        value: string | number
    }>
}
