import { getTransferCallData } from '../utils/generateTransferCallData'
import { getAbstractAccountAddress } from '../utils/getAbstractAccountAddress'
import { getSignerAddress } from '../utils/getSignerAddress'
import { Signer } from 'ethers'
import { UserOps } from '../UserOperations'
import { PublicClient } from 'viem'
import { TSmartAccount } from '../lib/permissionless/accounts/createSmartAccountClient'

export async function transferAssets(params: {
    transferData: {
        contractAddress: string
        recipient: string
        tokenId: string
        quantity?: number
    }
    signer: Signer
    aaRpcUrl: string
    smartAccount: TSmartAccount
    sendUserOp: UserOps['sendUserOp']
    client: PublicClient
    paymasterProxyUrl: string
    paymasterProxyAuthSecret: string
}) {
    const {
        transferData,
        signer,
        aaRpcUrl,
        sendUserOp,
        client,
        smartAccount,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
    } = params
    const { recipient, contractAddress, tokenId, quantity } = transferData
    const fromAddress = await getAbstractAccountAddress({
        rootKeyAddress: await getSignerAddress(signer),
        aaRpcUrl,
        newAccountImplementationType: smartAccount.type,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
    })
    if (!fromAddress) {
        throw new Error('Failed to get from address')
    }

    const callData = await getTransferCallData({
        recipient,
        tokenId,
        fromAddress,
        contractAddress,
        client,
        quantity,
    })

    return sendUserOp({
        toAddress: contractAddress as `0x${string}`,
        callData,
        signer,
        spaceId: undefined,
        functionHashForPaymasterProxy: 'transferTokens',
    })
}
