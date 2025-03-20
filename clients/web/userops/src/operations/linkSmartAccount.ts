import { Address, SpaceDapp } from '@towns-protocol/web3'
import { ethers } from 'ethers'
import { UserOps } from '../UserOperations'
import { TimeTracker, TimeTrackerEvents } from '../types'
import { getFunctionSigHash } from '../utils/getFunctionSigHash'
import { encodeDataForLinkingSmartAccount } from '../utils/encodeDataForLinkingSmartAccount'
import { CodeException } from '../errors'
import { SendUserOperationReturnType } from '../lib/types'

type Common = {
    spaceDapp: SpaceDapp | undefined
    timeTracker: TimeTracker | undefined
}

export async function linkSmartAccountAndWaitForReceipt(
    params: Common & {
        signer: ethers.Signer
        abstractAccountAddress: Address
        sequenceName: TimeTrackerEvents
        sendUserOp: UserOps['sendUserOp']
    },
) {
    const { spaceDapp, timeTracker, sendUserOp, sequenceName, signer } = params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const linkWalletUserOp = await linkSmartAccount({
        ...params,
        rootKeySigner: signer,
        sendUserOp,
    })

    let userOpEventWalletLink: Awaited<ReturnType<SendUserOperationReturnType['wait']>> | null

    try {
        const endLinkRelay = timeTracker?.startMeasurement(
            sequenceName,
            'userops_wait_for_link_wallet_relay',
        )
        userOpEventWalletLink = await linkWalletUserOp.wait()
        endLinkRelay?.()
        if (!userOpEventWalletLink?.args.success) {
            throw new CodeException({
                message: 'Failed to perform user operation for linking wallet',
                code: 'USER_OPS_FAILED_TO_PERFORM_USER_OPERATION_LINK_WALLET',
                category: 'userop',
            })
        }
    } catch (error) {
        throw new CodeException({
            message: 'Failed to perform user operation for linking wallet',
            code: 'USER_OPS_FAILED_TO_PERFORM_USER_OPERATION_LINK_WALLET',
            data: error,
            category: 'userop',
        })
    }

    try {
        const endWaitForLinkWalletTx = timeTracker?.startMeasurement(
            sequenceName,
            'userops_wait_for_link_wallet_tx',
        )
        const linkWalletReceipt = await spaceDapp.provider?.waitForTransaction(
            userOpEventWalletLink.transactionHash,
        )
        endWaitForLinkWalletTx?.()
        if (linkWalletReceipt?.status !== 1) {
            throw new CodeException({
                message: 'Failed to link wallet',
                code: 'USER_OPS_FAILED_TO_LINK_WALLET',
                category: 'userop',
            })
        }
    } catch (error) {
        throw new CodeException({
            message: 'Failed to link wallet',
            code: 'USER_OPS_FAILED_TO_LINK_WALLET',
            data: error,
            category: 'userop',
        })
    }
}

/**
 * User operation to link smart account wallet to the root key.
 * @param args
 */
export async function linkSmartAccount(
    params: Common & {
        rootKeySigner: ethers.Signer
        abstractAccountAddress: Address
        sequenceName?: TimeTrackerEvents
        sendUserOp: UserOps['sendUserOp']
    },
) {
    const {
        spaceDapp,
        timeTracker,
        rootKeySigner,
        abstractAccountAddress,
        sequenceName,
        sendUserOp,
    } = params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const signer = rootKeySigner
    const walletLink = spaceDapp.walletLink
    const functionName = 'linkCallerToRootKey'

    const functionHashForPaymasterProxy = getFunctionSigHash(
        walletLink.getInterface(),
        functionName,
    )

    const endEncoding = timeTracker?.startMeasurement(
        TimeTrackerEvents.JOIN_SPACE,
        'userops_encode_data_for_linking_smart_account',
    )

    const callDataForLinkingSmartAccount = await encodeDataForLinkingSmartAccount(
        spaceDapp,
        rootKeySigner,
        abstractAccountAddress,
    )

    endEncoding?.()

    return sendUserOp(
        {
            toAddress: spaceDapp.walletLink.address,
            callData: callDataForLinkingSmartAccount,
            signer,
            spaceId: undefined,
            functionHashForPaymasterProxy,
        },
        sequenceName,
    )
}
