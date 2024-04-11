import {
    Address,
    BaseChainConfig,
    ContractVersion,
    RiverChainConfig,
    Web3Deployment,
    getWeb3Deployment,
} from '@river-build/web3'

function getBaseRpcUrlForChain(chainId: number): string {
    if (process.env.BASE_CHAIN_RPC_URL) {
        return process.env.BASE_CHAIN_RPC_URL
    }
    switch (chainId) {
        case 31337:
            return 'http://localhost:8545'
        default:
            throw new Error(`No preset RPC url for base chainId ${chainId}`)
    }
}

function getRiverRpcUrlForChain(chainId: number): string {
    if (process.env.RIVER_CHAIN_RPC_URL) {
        return process.env.RIVER_CHAIN_RPC_URL
    }
    switch (chainId) {
        case 31338:
            return 'http://localhost:8546'
        case 6524490:
            return 'https://devnet.rpc.river.build'
        default:
            throw new Error(`No preset RPC url for river chainId ${chainId}`)
    }
}

function makeWeb3Deployment(): Web3Deployment {
    const RIVER_ENV = process.env.RIVER_ENV || 'local_single'

    // allow for passing a custom environment
    if (RIVER_ENV === 'custom') {
        return {
            base: {
                chainId: parseInt(process.env.BASE_CHAIN_ID!),
                contractVersion: (process.env.CONTRACT_VERSION ?? 'dev') as ContractVersion,
                addresses: {
                    spaceFactory: process.env.SPACE_FACTORY_ADDRESS! as Address,
                    spaceOwner: process.env.SPACE_OWNER_ADDRESS! as Address,
                    mockNFT: process.env.MOCK_NFT_ADDRESS as Address | undefined,
                    member: process.env.MEMBER_ADDRESS as Address | undefined,
                    walletLink: process.env.WALLET_LINK_ADDRESS! as Address,
                },
            },
            river: {
                chainId: parseInt(process.env.RIVER_CHAIN_ID!),
                contractVersion: (process.env.CONTRACT_VERSION ?? 'dev') as ContractVersion,
                addresses: {
                    riverRegistry: process.env.RIVER_REGISTRY_ADDRESS! as Address,
                },
            },
        }
    }
    // otherwise just return the deployment for the current environment
    return getWeb3Deployment(RIVER_ENV)
}

export function makeRiverChainConfig(): {
    rpcUrl: string
    chainConfig: RiverChainConfig
} {
    const env = makeWeb3Deployment()
    return {
        rpcUrl: getRiverRpcUrlForChain(env.river.chainId),
        chainConfig: env.river,
    }
}

export function makeBaseChainConfig(): { rpcUrl: string; chainConfig: BaseChainConfig } {
    const env = makeWeb3Deployment()
    return {
        rpcUrl: getBaseRpcUrlForChain(env.base.chainId),
        chainConfig: env.base,
    }
}

export type RiverConfig = ReturnType<typeof makeRiverConfig>

export const makeRiverConfig = () => {
    const config = {
        base: makeBaseChainConfig(),
        river: makeRiverChainConfig(),
    }
    return config
}
