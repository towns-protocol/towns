import { BigNumberish } from 'ethers'
import { IUserOperation } from 'userop'
import { create } from 'zustand'
import { FunctionHash, TimeTrackerEvents } from './types'
import { decodeCallData } from './utils'
import { TownsSimpleAccount } from './TownsSimpleAccount'
import { Space } from '@river-build/web3'
import { devtools, persist, PersistStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import superjson from 'superjson'

export enum PaymasterErrorCode {
    PAYMASTER_LIMIT_REACHED = 'PAYMASTER_LIMIT_REACHED',
    DAILY_LIMIT_REACHED = 'DAILY_LIMIT_REACHED',
}

type UserOpsState = {
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

type State = {
    userOps: { [sender: string]: UserOpsState }
}

type PersistentState = {
    userOps: { [sender: string]: Omit<UserOpsState, 'promptUser' | 'promptResponse'> }
}

type Actions = {
    saveOp: (args: {
        sender: string
        op: IUserOperation
        type: FunctionHash | undefined
        builder: TownsSimpleAccount
        space: Space | undefined
    }) => void
    setRejectedSponsorshipReason: (sender: string, reason: PaymasterErrorCode | undefined) => void
    reset: (sender: string | undefined) => void
    setOperationAttempt: (sender: string, attempt: number) => void
    setSequenceName: (sender: string, sequenceName: TimeTrackerEvents | undefined) => void
    setFunctionHashForPaymasterProxy: (
        sender: string,
        functionHashForPaymasterProxy: FunctionHash | undefined,
    ) => void
    setSpaceId: (sender: string, spaceId: string | undefined) => void
    setCurrOpValue: (sender: string, value: BigNumberish | undefined) => void
    setRetryDetails: (
        sender: string,
        retryDetails: { type: 'gasTooLow'; data: unknown } | undefined,
    ) => void
    setPromptUser: (sender: string, promptUser: boolean) => void
    setPromptResponse: (
        sender: string | undefined,
        promptResponse: 'confirm' | 'deny' | undefined,
    ) => void
}

const initialState: UserOpsState = Object.freeze({
    currOpValue: undefined,
    retryDetails: undefined,
    currOp: undefined,
    currOpDecodedCallData: undefined,
    rejectedSponsorshipReason: undefined,
    promptResponse: undefined,
    operationAttempt: 1,
    sequenceName: undefined,
    functionHashForPaymasterProxy: undefined,
    spaceId: undefined,
    promptUser: false,
})

const customStorage: PersistStorage<PersistentState> = {
    getItem: async (name) => {
        try {
            const item = localStorage.getItem(name)
            if (!item) return null
            return superjson.parse(item)
        } catch (error) {
            console.error('Error reading from localStorage:', error)
            return null
        }
    },
    setItem: (name, value) => {
        try {
            localStorage.setItem(name, superjson.stringify(value))
        } catch (error) {
            console.error('Error writing to localStorage:', error)
        }
    },
    removeItem: (name) => {
        try {
            localStorage.removeItem(name)
        } catch (error) {
            console.error('Error removing from localStorage:', error)
        }
    },
}

export const userOpsStore = create<State & Actions>()(
    devtools(
        persist(
            immer((set) => ({
                userOps: {},
                setRejectedSponsorshipReason: (sender, reason) => {
                    set(
                        (state) => {
                            prepInitialState(state, sender)
                            state.userOps[sender].rejectedSponsorshipReason = reason
                        },
                        undefined,
                        'userOps/setRejectedSponsorshipReason',
                    )
                },
                saveOp: ({
                    sender,
                    op,
                    type,
                    // value,
                    builder,
                    space,
                }) => {
                    set(
                        (state) => {
                            prepInitialState(state, sender)
                            state.userOps[sender].currOp = structuredClone(op)
                            state.userOps[sender].currOpDecodedCallData = decodeCallData({
                                callData: op.callData,
                                functionHash: type,
                                builder,
                                space,
                            })
                        },
                        undefined,
                        'userOps/saveOp',
                    )
                },
                setPromptResponse: (sender, promptResponse) => {
                    set(
                        (state) => {
                            if (!sender) return
                            prepInitialState(state, sender)
                            state.userOps[sender].promptResponse = promptResponse
                        },
                        undefined,
                        'userOps/setPromptResponse',
                    )
                },
                setOperationAttempt: (sender, attempt) => {
                    set(
                        (state) => {
                            prepInitialState(state, sender)
                            state.userOps[sender].operationAttempt = attempt
                        },
                        undefined,
                        'userOps/setOperationAttempt',
                    )
                },
                setSequenceName: (sender, sequenceName) => {
                    set(
                        (state) => {
                            prepInitialState(state, sender)
                            state.userOps[sender].sequenceName = sequenceName
                        },
                        undefined,
                        'userOps/setSequenceName',
                    )
                },
                setFunctionHashForPaymasterProxy: (sender, functionHashForPaymasterProxy) => {
                    set(
                        (state) => {
                            prepInitialState(state, sender)
                            state.userOps[sender].functionHashForPaymasterProxy =
                                functionHashForPaymasterProxy
                        },
                        undefined,
                        'userOps/setFunctionHashForPaymasterProxy',
                    )
                },
                setSpaceId: (sender, spaceId) => {
                    set(
                        (state) => {
                            prepInitialState(state, sender)
                            state.userOps[sender].spaceId = spaceId
                        },
                        undefined,
                        'userOps/setSpaceId',
                    )
                },
                setCurrOpValue: (sender, value) => {
                    set(
                        (state) => {
                            prepInitialState(state, sender)
                            state.userOps[sender].currOpValue = value
                        },
                        undefined,
                        'userOps/setCurrOpValue',
                    )
                },
                setRetryDetails: (sender, retryDetails) => {
                    set(
                        (state) => {
                            prepInitialState(state, sender)
                            state.userOps[sender].retryDetails = retryDetails
                        },
                        undefined,
                        'userOps/setRetryDetails',
                    )
                },
                setPromptUser: (sender, promptUser) => {
                    set(
                        (state) => {
                            prepInitialState(state, sender)
                            state.userOps[sender].promptUser = promptUser
                        },
                        undefined,
                        'userOps/setPromptUser',
                    )
                },
                reset: (sender) => {
                    set(
                        (state) => {
                            if (sender) {
                                state.userOps[sender] = { ...initialState }
                            }
                        },
                        undefined,
                        'userOps/clear',
                    )
                },
            })),
            {
                name: 'towns/user-ops',
                version: 1,
                storage: customStorage,
                partialize: (state) => {
                    const { userOps } = state
                    // Create new userOps object with promptUser filtered out from each entry
                    const filteredUserOps = Object.fromEntries(
                        Object.entries(userOps).map(([key, value]) => {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { promptUser, promptResponse, ...rest } = value
                            return [key, rest]
                        }),
                    )
                    return {
                        userOps: filteredUserOps,
                    }
                },
            },
        ),
        {
            serialize: {
                replacer: (_key: string, value: unknown) => {
                    if (typeof value === 'bigint') {
                        return value.toString()
                    }
                    return value
                },
            },
        },
    ),
)

export const selectUserOpsByAddress = (address: string | undefined, state: State) =>
    address ? state.userOps[address] : undefined

const prepInitialState = (state: State, sender: string) => {
    if (!state.userOps[sender]) {
        state.userOps[sender] = { ...initialState }
    }
}
