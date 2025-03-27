import { simpleSmartAccount } from './simple/client'
import { modularSmartAccount } from './modular/client'
import { SmartAccountType } from '../../../types'
import { ethersSignerToAccount } from '../utils/ethersSignerToAccount'
import { getChain } from '../utils/getChain'
import { determineSmartAccount } from './determineSmartAccount'
import { createPublicClient, http } from 'viem'
import { PublicClient } from 'viem'
import { Signer } from 'ethers'
import { SpaceDapp } from '@towns-protocol/web3'

export const setupSmartAccount = async (args: {
    newAccountImplementationType: SmartAccountType
    signer: Signer
    rpcUrl: string
    bundlerUrl: string
    paymasterProxyUrl: string
    paymasterProxyAuthSecret: string
    spaceDapp: SpaceDapp | undefined
    fetchAccessTokenFn: (() => Promise<string | null>) | undefined
}) => {
    const {
        newAccountImplementationType,
        signer,
        rpcUrl,
        bundlerUrl,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
        spaceDapp,
        fetchAccessTokenFn,
    } = args

    const owner = await ethersSignerToAccount(signer)
    const chain = await getChain(signer)

    const { address, accountType } = await determineSmartAccount({
        ownerAddress: owner.address,
        rpcUrl,
        newAccountImplementationType,
    })

    const publicRpcClient = createPublicClient({
        transport: http(args.rpcUrl),
        chain,
    }) as PublicClient

    if (accountType === 'simple') {
        return simpleSmartAccount({
            publicRpcClient,
            owner,
            rpcUrl,
            chain,
            address,
            bundlerUrl,
            paymasterProxyUrl,
            paymasterProxyAuthSecret,
            spaceDapp,
            fetchAccessTokenFn,
        })
    }

    if (accountType === 'modular') {
        return modularSmartAccount({
            publicRpcClient,
            owner,
            rpcUrl,
            chain,
            address,
            bundlerUrl,
            paymasterProxyUrl,
            paymasterProxyAuthSecret,
            spaceDapp,
            fetchAccessTokenFn,
        })
    }
    throw new Error(`Unsupported account type`)
}
