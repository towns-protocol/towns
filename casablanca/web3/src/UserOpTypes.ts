import { ethers } from 'ethers'
import { TDefaultVersion, Versions } from './ContractTypes'
import { PublicClient } from 'viem'

type ProviderType<V extends Versions = TDefaultVersion> = V extends 'v3'
    ? ethers.providers.Provider
    : PublicClient

export type UserOpSpaceDappConfig<V extends Versions = TDefaultVersion> = {
    chainId: number
    provider: ProviderType<V> | undefined
    /**
     * Node RPC url
     */
    rpcUrl: string
    /**
     * Optionally route bundler RPC methods to this endpoint. If the bundler and node RPC methods do not share the same rpcUrl, you must provide this. (i.e. local dev, or different node provider than bundler provider)
     * https://docs.stackup.sh/docs/useropjs-provider#bundlerjsonrpcprovider
     */
    bundlerUrl?: string
    /**
     * UserOp client
     */
    // userOpClient: Client
    entryPointAddress?: string
    factoryAddress?: string
}

export type PaymasterConfig = {
    /**
     * Paymaster URL
     */
    url: string
}

export type UserOpParams = {
    toAddress?: string
    callData?: string
    value?: ethers.BigNumberish
    signer: ethers.Signer
    paymasterConfig?: PaymasterConfig
}
