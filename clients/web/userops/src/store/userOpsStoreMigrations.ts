import { BigNumber, BigNumberish, BytesLike } from 'ethers'
import { FunctionHash, PaymasterErrorCode, RetryType, TimeTrackerEvents } from '../types'
import { decodeCallData } from '../utils/decodeCallData'
import { IUserOperation } from '../types'
import { bytesToHex, isBytes, isHex } from 'viem'
import { Hex } from 'viem'
import { UserOperation } from 'viem/account-abstraction'

type V1State = {
    currOp: IUserOperation | undefined
    currOpValue: BigNumberish | undefined
    promptUser: boolean
    currOpDecodedCallData: ReturnType<typeof decodeCallData<FunctionHash>> | undefined
    rejectedSponsorshipReason: PaymasterErrorCode | undefined
    operationAttempt: number
    sequenceName?: TimeTrackerEvents | undefined
    functionHashForPaymasterProxy?: FunctionHash | undefined
    spaceId?: string | undefined
    retryDetails?: {
        type: 'gasTooLow'
        data: unknown
    }
    promptResponse: 'confirm' | 'deny' | undefined
}

export type V2OpDetails = {
    op: IUserOperation | undefined
    value: BigNumberish | undefined
    decodedCallData: ReturnType<typeof decodeCallData<FunctionHash>> | undefined
    functionHashForPaymasterProxy?: FunctionHash | undefined
    spaceId?: string | undefined
}

export type V2State = {
    current: V2OpDetails
    pending: V2OpDetails & {
        hash: string | undefined
    }
    promptUser: boolean
    rejectedSponsorshipReason: PaymasterErrorCode | undefined
    operationAttempt: number
    // TODO: remove this
    sequenceName?: TimeTrackerEvents | undefined
    retryDetails?: {
        type: RetryType
        data: unknown
    }
    promptResponse: 'confirm' | 'deny' | undefined
}

export type V3OpDetails = {
    op: UserOperation | undefined
    functionHashForPaymasterProxy?: FunctionHash | undefined
    spaceId?: string | undefined
}

export type V3State = {
    current: V3OpDetails
    pending: V3OpDetails & {
        hash: string | undefined
    }
    promptUser: boolean
    rejectedSponsorshipReason: PaymasterErrorCode | undefined
    operationAttempt: number
    // TODO: remove this
    sequenceName?: TimeTrackerEvents | undefined
    retryDetails?: {
        type: RetryType
        data: unknown
    }
    promptResponse: 'confirm' | 'deny' | undefined
}

export type V1PersistentState = {
    userOps: { [sender: string]: Omit<V1State, 'promptUser' | 'promptResponse'> }
}

export type V2PersistentState = {
    userOps: { [sender: string]: Omit<V2State, 'promptUser' | 'promptResponse'> }
}

export type V3PersistentState = {
    userOps: { [sender: string]: Omit<V3State, 'promptUser' | 'promptResponse'> }
}

export const migrations = {
    1: (state: V1PersistentState): V2PersistentState => {
        const newUserOps: V2PersistentState['userOps'] = Object.fromEntries(
            Object.entries(state.userOps).map(
                ([sender, oldState]: [string, Omit<V1State, 'promptUser' | 'promptResponse'>]) => {
                    return [
                        sender,
                        {
                            operationAttempt: oldState.operationAttempt ?? 1,
                            rejectedSponsorshipReason: oldState.rejectedSponsorshipReason,
                            retryDetails: oldState.retryDetails
                                ? {
                                      type: oldState.retryDetails.type,
                                      data: oldState.retryDetails.data,
                                  }
                                : undefined,
                            sequenceName: oldState.sequenceName,
                            current: {
                                op: oldState.currOp,
                                value: oldState.currOpValue,
                                decodedCallData: oldState.currOpDecodedCallData,
                                functionHashForPaymasterProxy:
                                    oldState.functionHashForPaymasterProxy,
                                spaceId: oldState.spaceId,
                            },
                            pending: {
                                op: undefined,
                                value: undefined,
                                decodedCallData: undefined,
                                hash: undefined,
                                functionHashForPaymasterProxy: undefined,
                                spaceId: undefined,
                            },
                        },
                    ]
                },
            ),
        )

        return {
            userOps: newUserOps,
        }
    },
    2: (state: V2PersistentState): V3PersistentState => {
        const newUserOps: V3PersistentState['userOps'] = Object.fromEntries(
            Object.entries(state.userOps).map(
                ([sender, oldState]: [string, Omit<V2State, 'promptUser' | 'promptResponse'>]) => {
                    const oldCurrentOp = oldState.current
                    const oldPendingOp = oldState.pending
                    return [
                        sender,
                        {
                            ...oldState,
                            current: {
                                spaceId: oldCurrentOp.spaceId,
                                op: oldCurrentOp.op
                                    ? (v2OpToV3Op(oldCurrentOp.op) satisfies UserOperation)
                                    : undefined,
                                functionHashForPaymasterProxy:
                                    oldCurrentOp.functionHashForPaymasterProxy,
                            } satisfies V3OpDetails,
                            pending: {
                                spaceId: oldPendingOp.spaceId,
                                op: oldPendingOp.op
                                    ? (v2OpToV3Op(oldPendingOp.op) satisfies UserOperation)
                                    : undefined,
                                hash: oldPendingOp.hash,
                                functionHashForPaymasterProxy:
                                    oldPendingOp.functionHashForPaymasterProxy,
                            } satisfies V3OpDetails & { hash: string | undefined },
                        },
                    ]
                },
            ),
        )

        return {
            userOps: newUserOps,
        }
    },
}

const bytesLikeToHex = (bytes: BytesLike): Hex => {
    if (isBytes(bytes)) {
        return bytesToHex(bytes)
    }
    if (isHex(bytes)) {
        return bytes
    }
    throw new Error('Invalid bytes')
}

const v2OpToV3Op = (op: IUserOperation): UserOperation => {
    return {
        sender: op.sender as `0x${string}`,
        callData: bytesLikeToHex(op.callData),
        callGasLimit: BigNumber.from(op.callGasLimit).toBigInt(),
        maxFeePerGas: BigNumber.from(op.maxFeePerGas).toBigInt(),
        maxPriorityFeePerGas: BigNumber.from(op.maxPriorityFeePerGas).toBigInt(),
        nonce: BigNumber.from(op.nonce).toBigInt(),
        preVerificationGas: BigNumber.from(op.preVerificationGas).toBigInt(),
        verificationGasLimit: BigNumber.from(op.verificationGasLimit).toBigInt(),
        signature: bytesLikeToHex(op.signature),
        initCode: bytesLikeToHex(op.initCode),
        paymasterAndData: bytesLikeToHex(op.paymasterAndData),
    }
}
