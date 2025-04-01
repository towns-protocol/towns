import { BigNumber, Signer, BigNumberish } from 'ethers'
import { getAbstractAccountAddress } from '../utils/getAbstractAccountAddress'
import { SpaceDapp } from '@towns-protocol/web3'
import { getSignerAddress } from '../utils/getSignerAddress'
import { UserOps } from '../UserOperations'
import { TSmartAccount } from '../lib/permissionless/accounts/createSmartAccountClient'

export async function transferEth(params: {
    transferData: {
        recipient: string
        value: BigNumberish
    }
    signer: Signer
    spaceDapp: SpaceDapp | undefined
    aaRpcUrl: string
    factoryAddress: string | undefined
    entryPointAddress: string | undefined
    sendUserOp: UserOps['sendUserOp']
    smartAccount: TSmartAccount
    paymasterProxyUrl: string
    paymasterProxyAuthSecret: string
}) {
    const {
        transferData,
        signer,
        aaRpcUrl,
        sendUserOp,
        smartAccount,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
    } = params
    const { recipient, value } = transferData

    const aaAddress = await getAbstractAccountAddress({
        rootKeyAddress: await getSignerAddress(signer),
        aaRpcUrl,
        newAccountImplementationType: smartAccount.type,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
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
        value: BigNumber.from(value).toBigInt(),
    })
}
