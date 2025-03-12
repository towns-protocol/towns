import { BigNumberish } from 'ethers'
import { FunctionHash, PaymasterErrorCode, RetryType, TimeTrackerEvents } from '../types'
import { decodeCallData } from '../utils/decodeCallData'
import { IUserOperation } from '../types'
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

export type V1PersistentState = {
    userOps: { [sender: string]: Omit<V1State, 'promptUser' | 'promptResponse'> }
}

export type V2PersistentState = {
    userOps: { [sender: string]: Omit<V2State, 'promptUser' | 'promptResponse'> }
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
}
