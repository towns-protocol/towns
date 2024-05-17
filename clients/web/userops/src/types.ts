import { BaseChainConfig, SpaceDapp } from '@river-build/web3'
import { ethers } from 'ethers'

export type AccountAbstractionConfig = Omit<UserOpsConfig, 'chainId' | 'provider' | 'config'>

export type UserOpsConfig = {
    provider: SpaceDapp['provider']
    config: BaseChainConfig
    /**
     * Node RPC url for user operations
     */
    aaRpcUrl: string
    /**
     * Optionally route bundler RPC methods to this endpoint. If the bundler and node RPC methods do not share the same rpcUrl, you must provide this. (i.e. local dev, or different node provider than bundler provider)
     * https://docs.stackup.sh/docs/useropjs-provider#bundlerjsonrpcprovider
     */
    bundlerUrl?: string
    /**
     * Send userops to paymaster proxy for verification. Omitting this requires users to fund their AA wallet with gas.
     */
    paymasterProxyUrl?: string
    entryPointAddress?: string
    factoryAddress?: string
    paymasterProxyAuthSecret?: string
    skipPromptUserOnPMRejectedOp: boolean
}

export type UserOpParams = {
    value?: ethers.BigNumberish
    signer: ethers.Signer
} & (ExecuteSingleData | ExecuteBatchData)

type ExecuteSingleData = {
    toAddress?: string
    callData?: string
}

type ExecuteBatchData = {
    toAddress?: string[]
    callData?: string[]
}

export const FunctionHash = {
    createSpace: 'createSpace',
    removeLink: 'removeLink',
    joinSpace: 'joinSpace',
    linkCallerToRootKey: 'linkCallerToRootKey',
    // RoleBase.sol
    createRole: 'createRole',
    removeRole: 'removeRole',
    updateRole: 'updateRole',
    // ChannelBase.sol
    createChannel: 'createChannel',
    updateChannel: 'updateChannel',
    removeChannel: 'removeChannel',
    addRoleToChannel: 'addRoleToChannel',
    removeRoleFromChannel: 'removeRoleFromChannel',
    // EntitlementsManagerBase.sol
    removeEntitlementModule: 'removeEntitlementModule',
    addEntitlementModule: 'addEntitlementModule',
    // SpaceOwnerBase.sol
    updateSpaceInfo: 'updateSpaceInfo',
    // WalletLink.sol
    linkWalletToRootKey: 'linkWalletToRootKey',
    // Banning.sol
    ban: 'ban',
    unban: 'unban',
    createSpace_linkWallet: 'createSpace_linkWallet',
    joinSpace_linkWallet: 'joinSpace_linkWallet',
} as const
