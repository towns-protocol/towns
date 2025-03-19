import { FunctionHash, TimeTrackerEvents } from '../../types'
import { Signer } from 'ethers'
import { Address, Hex } from 'viem'
import { encodeExecuteAbi, encodeExecuteBatchAbi } from './accounts/simple/abi'
import { selectUserOpsByAddress } from '../../store/userOpsStore'
import { userOpsStore } from '../../store/userOpsStore'
import { getUserOperationReceipt } from '../getUserOperationReceipt'
import { SendUserOperationReturnType } from '../types'
import { sendUserOperationWithRetry } from '../sendUserOperationWithRetry'
import { TSmartAccount } from './accounts/createSmartAccountClient'

export type UserOpParamsPermissionless = {
    value?: bigint
    signer: Signer
} & (ExecuteSingleData | ExecuteBatchData)

type ExecuteSingleData = {
    toAddress?: string
    callData?: string
}

type ExecuteBatchData = {
    toAddress?: string[]
    callData?: string[]
}

export async function sendUseropWithPermissionless(
    args: UserOpParamsPermissionless & {
        functionHashForPaymasterProxy: FunctionHash
        spaceId: string | undefined
        retryCount?: number
        smartAccountClient: TSmartAccount
        sequenceName?: TimeTrackerEvents
    },
): Promise<SendUserOperationReturnType> {
    const { toAddress, callData, value, smartAccountClient, sequenceName } = args
    const sender = smartAccountClient.address

    if (!toAddress) {
        throw new Error('toAddress is required')
    }
    if (!callData) {
        throw new Error('callData is required')
    }

    let _callData: Hex

    console.log(`[UserOperations] debug::callData`, {
        sender,
        toAddress,
        callData,
        value,
    })

    if (Array.isArray(toAddress)) {
        if (!Array.isArray(callData)) {
            throw new Error('callData must be an array if toAddress is an array')
        }
        if (toAddress.length !== callData.length) {
            throw new Error('toAddress and callData must be the same length')
        }
        _callData = encodeExecuteBatchAbi({
            to: toAddress as `0x${string}`[],
            data: callData as `0x${string}`[],
        })
    } else {
        if (Array.isArray(callData)) {
            throw new Error('callData must be a string if toAddress is a string')
        }
        /**
         * IMPORTANT: This value can result in RPC errors if the smart account has insufficient funds
         *
         * If estimating user operation gas, you can override sender balance via state overrides https://docs.stackup.sh/docs/erc-4337-bundler-rpc-methods#eth_senduseroperation
         * which we are doing, see prompttUser middleware
         *
         * However, in the case of a tx that costs ETH, but that we also want to sponsor, this value should be 0
         * Otherwise, the paymaster will reject the operation if the user does not have enough funds
         * This kind of tx would be something like joining a town that has a fixed membership cost, but ALSO contains prepaid seats
         */
        _callData = encodeExecuteAbi({
            to: toAddress as `0x${string}`,
            value: value ?? 0n,
            data: callData as `0x${string}`,
        })
    }

    const resetUseropStore = () => {
        console.log('[UserOperations] resetting user op store')
        const { setCurrent, reset, setSequenceName } = userOpsStore.getState()
        reset(sender)
        setSequenceName(sender, sequenceName)
        setCurrent({
            sender,
            op: undefined,
            functionHashForPaymasterProxy: args.functionHashForPaymasterProxy,
            spaceId: args.spaceId,
        })
    }

    const pendingUserOp = selectUserOpsByAddress(sender).pending

    if (pendingUserOp.hash) {
        console.log('[UserOperations] pending user op found, checking if it has landed...')
        try {
            // check if the pending op has landed
            const result = await getUserOperationReceipt({
                bundlerClient: smartAccountClient.client,
                userOpHash: pendingUserOp.hash as Address,
            })

            if (result) {
                console.log('[UserOperations] previously pending user op landed', result)
                resetUseropStore()
            } else {
                console.log('[UserOperations] previously pending user op has not landed')
            }
        } catch (error) {
            // TODO: retry getUserOperationReceipt
            console.log('[UserOperations] error getting user operation receipt', error)
            resetUseropStore()
        }
    } else {
        resetUseropStore()
    }

    const opResponse = await sendUserOperationWithRetry({
        smartAccount: smartAccountClient,
        callData: _callData,
    })

    // if op made it to the bundler, copy to pending
    userOpsStore.getState().setPending({
        sender,
        hash: opResponse.userOpHash,
    })
    console.log(
        '[UserOperations] set pending user op',
        userOpsStore.getState().userOps[sender].pending,
    )
    return {
        userOpHash: opResponse.userOpHash,
        wait: async () => {
            return opResponse.wait()
        },
        getUserOperationReceipt: async () => {
            const receipt = await opResponse.getUserOperationReceipt()
            return receipt
        },
    }
}
