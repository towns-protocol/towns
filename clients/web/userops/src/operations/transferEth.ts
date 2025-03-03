import { ethers } from 'ethers'
import { getAbstractAccountAddress } from '../utils/getAbstractAccountAddress'
import { SpaceDapp } from '@river-build/web3'
import { getSignerAddress } from '../utils/getSignerAddress'
import { UserOps } from '../UserOperations'

export async function transferEth(params: {
    transferData: {
        recipient: string
        value: ethers.BigNumberish
    }
    signer: ethers.Signer
    spaceDapp: SpaceDapp | undefined
    aaRpcUrl: string
    factoryAddress: string | undefined
    entryPointAddress: string | undefined
    sendUserOp: UserOps['sendUserOp']
}) {
    const {
        transferData,
        signer,
        spaceDapp,
        aaRpcUrl,
        factoryAddress,
        entryPointAddress,
        sendUserOp,
    } = params
    const { recipient, value } = transferData

    const aaAddress = await getAbstractAccountAddress({
        rootKeyAddress: await getSignerAddress(signer),
        factoryAddress,
        entryPointAddress,
        spaceDapp,
        aaRpcUrl,
    })

    if (!aaAddress) {
        throw new Error('Failed to get AA address')
    }

    console.log('[UserOperations] sendTransferEthOp', {
        toAddress: recipient,
        callData: '0x',
        functionHashForPaymasterProxy: 'transferEth',
        spaceId: undefined,
        value,
    })

    return sendUserOp({
        toAddress: recipient,
        callData: '0x',
        functionHashForPaymasterProxy: 'transferEth',
        signer,
        spaceId: undefined,
        value,
    })
}
