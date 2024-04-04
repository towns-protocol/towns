import { BaseChainConfig, SpaceDapp } from '@river-build/web3'
import { IUserOperationMiddlewareCtx } from 'userop'
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
    paymasterMiddleware?: (
        args: {
            userOpContext: IUserOperationMiddlewareCtx
            rootKeyAddress: string
            functionHashForPaymasterProxy: string | undefined
            townId: string | undefined
        } & Pick<
            UserOpsConfig,
            'bundlerUrl' | 'aaRpcUrl' | 'provider' | 'config' | 'paymasterProxyUrl'
        >,
    ) => Promise<void>
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
