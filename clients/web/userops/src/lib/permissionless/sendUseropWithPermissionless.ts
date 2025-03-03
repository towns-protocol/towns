import { SpaceDapp } from '@river-build/web3'
import { FunctionHash, TimeTrackerEvents } from '../../types'
import { BigNumber, ethers } from 'ethers'
import { Address, Hex } from 'viem'
import { encodeExecuteAbi, encodeExecuteBatchAbi } from './accounts/simple/abi'
import { selectUserOpsByAddress } from '../../store/userOpsStore'
import { userOpsStore } from '../../store/userOpsStore'
import { decodeCallData } from '../../utils/decodeCallData'
import { getUserOperationReceipt } from '../getUserOperationReceipt'
import { SendUserOperationReturnType } from '../types'
import { sendUserOperationWithRetry } from '../sendUserOperationWithRetry'
import { TSmartAccount } from './accounts/createSmartAccountClient'

export type UserOpParamsPermissionless = {
    value?: bigint
    signer: ethers.Signer
} & (ExecuteSingleData | ExecuteBatchData)

type ExecuteSingleData = {
    toAddress?: Address
    callData?: Hex
}

type ExecuteBatchData = {
    toAddress?: Address[]
    callData?: Hex[]
}

export async function sendUseropWithPermissionless(
    args: UserOpParamsPermissionless & {
        functionHashForPaymasterProxy: FunctionHash
        spaceId: string | undefined
        retryCount?: number
        smartAccountClient: TSmartAccount
        sequenceName?: TimeTrackerEvents
        spaceDapp: SpaceDapp | undefined
    },
): Promise<SendUserOperationReturnType> {
    const { toAddress, callData, value, smartAccountClient, sequenceName, spaceDapp } = args
    const sender = smartAccountClient.address

    if (!toAddress) {
        throw new Error('toAddress is required')
    }
    if (!callData) {
        throw new Error('callData is required')
    }

    let _callData: Hex

    if (Array.isArray(toAddress)) {
        if (!Array.isArray(callData)) {
            throw new Error('callData must be an array if toAddress is an array')
        }
        if (toAddress.length !== callData.length) {
            throw new Error('toAddress and callData must be the same length')
        }
        _callData = encodeExecuteBatchAbi({
            to: toAddress,
            data: callData,
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
            to: toAddress,
            value: value ? BigNumber.from(value).toBigInt() : 0n,
            data: callData,
        })
    }

    const resetUseropStore = () => {
        const { setCurrent, reset, setSequenceName } = userOpsStore.getState()
        reset(sender)
        const space = args.spaceId ? spaceDapp?.getSpace(args.spaceId) : undefined
        const decodedCallData = decodeCallData({
            callData: _callData,
            functionHash: args.functionHashForPaymasterProxy,
            space,
        })
        setSequenceName(sender, sequenceName)
        setCurrent({
            sender,
            op: undefined,
            value: args.value,
            decodedCallData,
            functionHashForPaymasterProxy: args.functionHashForPaymasterProxy,
            spaceId: args.spaceId,
        })
    }

    const pendingUserOp = selectUserOpsByAddress(sender).pending

    if (pendingUserOp.hash) {
        try {
            // check if the pending op has landed
            const result = await getUserOperationReceipt({
                bundlerClient: smartAccountClient.client,
                userOpHash: pendingUserOp.hash as Address,
            })

            if (result) {
                resetUseropStore()
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
