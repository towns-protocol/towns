import { SpaceDapp } from '@river-build/web3'
import { getTransferCallData } from '../utils/generateTransferCallData'
import { getAbstractAccountAddress } from '../utils/getAbstractAccountAddress'
import { getSignerAddress } from '../utils/getSignerAddress'
import { ethers } from 'ethers'
import { UserOps } from '../UserOperations'
import { BundlerJsonRpcProvider } from 'userop'

export async function transferAssets(params: {
    transferData: {
        contractAddress: string
        recipient: string
        tokenId: string
        quantity?: number
    }
    provider: BundlerJsonRpcProvider
    signer: ethers.Signer
    factoryAddress: string | undefined
    entryPointAddress: string | undefined
    spaceDapp: SpaceDapp | undefined
    aaRpcUrl: string
    sendUserOp: UserOps['sendUserOp']
}) {
    const {
        transferData,
        provider,
        signer,
        factoryAddress,
        entryPointAddress,
        spaceDapp,
        aaRpcUrl,
        sendUserOp,
    } = params
    const { recipient, contractAddress, tokenId, quantity } = transferData
    const fromAddress = await getAbstractAccountAddress({
        rootKeyAddress: await getSignerAddress(signer),
        factoryAddress,
        entryPointAddress,
        spaceDapp,
        aaRpcUrl,
    })
    if (!fromAddress) {
        throw new Error('Failed to get from address')
    }

    const callData = await getTransferCallData({
        recipient,
        tokenId,
        fromAddress,
        contractAddress,
        provider,
        quantity,
    })

    return sendUserOp({
        toAddress: contractAddress,
        callData,
        signer,
        spaceId: undefined,
        functionHashForPaymasterProxy: 'transferTokens',
    })
}
