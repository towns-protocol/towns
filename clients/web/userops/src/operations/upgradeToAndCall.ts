import { upgradeAbi } from '../lib/permissionless/accounts/simple/abi'
import { TSmartAccount } from '../lib/permissionless/accounts/createSmartAccountClient'
import { UserOps } from '../UserOperations'
import { Address, decodeFunctionData, encodeFunctionData } from 'viem'
import { Signer } from 'ethers'
import { semiModularAccountStorageAbi } from '../lib/permissionless/accounts/modular/abis/semiModularAccountStorageAbi'
import { getDefaultSMAV2StorageAddress } from '../lib/permissionless/accounts/modular/utils'
import { Hex } from 'viem'

export async function encodedUpgradeToAndCall(args: {
    smartAccountClient: TSmartAccount
    signer: Signer
}) {
    const { smartAccountClient, signer } = args

    if (smartAccountClient.type !== 'simple') {
        throw new Error('Upgrade not supported for this account type')
    }

    const intializeData = encodeFunctionData({
        abi: semiModularAccountStorageAbi,
        functionName: 'initialize',
        args: [(await signer.getAddress()) as Address],
    })

    const implAddress =
        smartAccountClient.client.chain &&
        getDefaultSMAV2StorageAddress(smartAccountClient.client.chain)

    if (!implAddress) {
        throw new Error('No implementation address found')
    }

    const callData = encodeFunctionData({
        abi: upgradeAbi,
        functionName: 'upgradeToAndCall',
        args: [implAddress, intializeData],
    })

    console.log('[upgradeTo] implAddress', implAddress)
    console.log('[upgradeTo] initData', intializeData)
    console.log('[upgradeTo] callData', callData)

    return {
        toAddress: smartAccountClient.address,
        callData,
        implAddress,
        intializeData,
    }
}

export async function upgradeToAndCall(args: {
    sendUserOp: UserOps['sendUserOp']
    smartAccountClient: TSmartAccount
    signer: Signer
}) {
    const { sendUserOp, smartAccountClient, signer } = args
    const data = await encodedUpgradeToAndCall({
        smartAccountClient,
        signer,
    })
    return sendUserOp({
        ...data,
        signer,
        spaceId: undefined,
        functionHashForPaymasterProxy: 'upgradeToAndCall',
    })
}

export async function upgradeToAndWaitForReceipt(args: {
    sendUserOp: UserOps['sendUserOp']
    smartAccountClient: TSmartAccount
    signer: Signer
}) {
    const op = await upgradeToAndCall(args)
    const receipt = await op.getUserOperationReceipt()
    if (!receipt) {
        throw new Error('Timed out waiting for upgrade to and call receipt')
    }
    if (!receipt.success) {
        throw new Error('Upgrade to and call failed')
    }
    return receipt
}

export function decodeUpgradeToFunctionData(args: { data: Hex }) {
    try {
        const { data } = args
        const { functionName } = decodeFunctionData({
            abi: upgradeAbi,
            data,
        })
        return functionName
    } catch (e) {
        // noop
    }
}
