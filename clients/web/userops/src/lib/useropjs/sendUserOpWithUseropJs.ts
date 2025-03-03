import { FunctionHash, TimeTrackerEvents } from '../../types'
import { TownsSimpleAccount } from './TownsSimpleAccount'
import { TownsUserOpClient } from './TownsUserOpClient'
import { decodeCallData } from '../../utils/decodeCallData'
import { selectUserOpsByAddress, userOpsStore } from '../..'
import { SpaceDapp } from '@river-build/web3'
import { OpToJSON } from 'userop/dist/utils/json'
import { getUserOperationReceipt } from '../getUserOperationReceipt'
import { sendUserOperationWithRetry } from '../sendUserOperationWithRetry'
import { BytesLike, BigNumberish, Signer } from 'ethers'
import { SendUserOperationReturnType } from '../types'

export type UserOpParamsUseropJs = {
    value?: BigNumberish
    signer: Signer
} & (ExecuteSingleData | ExecuteBatchData)

type ExecuteSingleData = {
    toAddress?: string
    callData?: BytesLike
}

type ExecuteBatchData = {
    toAddress?: string[]
    callData?: BytesLike[]
}

export async function sendUserOpWithUseropJs(
    args: UserOpParamsUseropJs & {
        // a function signature hash to pass to paymaster proxy - this is just the function name for now
        functionHashForPaymasterProxy: FunctionHash
        spaceId: string | undefined
        retryCount?: number
        builder: TownsSimpleAccount
        userOpClient: TownsUserOpClient
        sequenceName?: TimeTrackerEvents
        spaceDapp: SpaceDapp | undefined
    },
): Promise<SendUserOperationReturnType> {
    const { toAddress, callData, value, builder, userOpClient, sequenceName, spaceDapp } = args
    const sender = builder.getSenderAddress()

    if (!toAddress) {
        throw new Error('toAddress is required')
    }
    if (!callData) {
        throw new Error('callData is required')
    }

    let simpleAccount: TownsSimpleAccount
    if (Array.isArray(toAddress)) {
        if (!Array.isArray(callData)) {
            throw new Error('callData must be an array if toAddress is an array')
        }
        if (toAddress.length !== callData.length) {
            throw new Error('toAddress and callData must be the same length')
        }
        simpleAccount = builder.executeBatch(toAddress, callData)
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
        simpleAccount = builder.execute(toAddress, value ?? 0, callData)
    }

    const op = simpleAccount.getOp()

    const resetUseropStore = () => {
        const { setCurrent, reset, setSequenceName } = userOpsStore.getState()
        reset(sender)
        const space = args.spaceId ? spaceDapp?.getSpace(args.spaceId) : undefined
        const decodedCallData = decodeCallData({
            callData: op.callData,
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
                provider: builder.provider,
                userOpHash: pendingUserOp.hash,
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
        userOpClient,
        simpleAccount,
        retryCount: args.retryCount,
        onBuild: (op) => {
            // update finalized op
            userOpsStore.getState().setCurrent({
                sender,
                op: OpToJSON(op),
            })
        },
    })

    // if op made it to the bundler, copy to pending
    userOpsStore.getState().setPending({
        sender,
        hash: opResponse.userOpHash,
    })
    return opResponse
}
