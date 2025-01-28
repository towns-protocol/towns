import { BigNumberish } from 'ethers'
import { IUserOperation } from 'userop'
import { create } from 'zustand'
import { FunctionHash, TimeTrackerEvents } from './types'
import { devtools, persist, PersistStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import superjson from 'superjson'
import { decodeCallData } from './decodeCallData'
export enum PaymasterErrorCode {
    PAYMASTER_LIMIT_REACHED = 'PAYMASTER_LIMIT_REACHED',
    DAILY_LIMIT_REACHED = 'DAILY_LIMIT_REACHED',
}
type RetryType = 'gasTooLow' | 'replacementUnderpriced'

type OpDetails = {
    op: IUserOperation | undefined
    value: BigNumberish | undefined
    decodedCallData: ReturnType<typeof decodeCallData<FunctionHash>> | undefined
    functionHashForPaymasterProxy?: FunctionHash | undefined
    spaceId?: string | undefined
}

type UserOpsState = {
    current: OpDetails
    pending: OpDetails & {
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

type State = {
    userOps: { [sender: string]: UserOpsState }
}

type PersistentState = {
    userOps: { [sender: string]: Omit<UserOpsState, 'promptUser' | 'promptResponse'> }
}

type Actions = {
    setCurrent: (
        args: {
            sender: string
        } & Partial<OpDetails>,
    ) => void
    setPending: (args: { sender: string; hash: string }) => void
    setRejectedSponsorshipReason: (sender: string, reason: PaymasterErrorCode | undefined) => void
    reset: (sender: string | undefined) => void
    setOperationAttempt: (sender: string, attempt: number) => void
    setSequenceName: (sender: string, sequenceName: TimeTrackerEvents | undefined) => void
    setRetryDetails: (
        sender: string,
        retryDetails: { type: RetryType; data: unknown } | undefined,
    ) => void
    setPromptUser: (sender: string, promptUser: boolean) => void
    setPromptResponse: (
        sender: string | undefined,
        promptResponse: 'confirm' | 'deny' | undefined,
    ) => void
}

const initialState = Object.freeze({
    operationAttempt: 1,
    promptResponse: undefined,
    promptUser: false,
    rejectedSponsorshipReason: undefined,
    retryDetails: undefined,
    sequenceName: undefined,
    current: {
        op: undefined,
        value: undefined,
        decodedCallData: undefined,
        functionHashForPaymasterProxy: undefined,
        spaceId: undefined,
    },
    pending: {
        op: undefined,
        value: undefined,
        decodedCallData: undefined,
        hash: undefined,
        functionHashForPaymasterProxy: undefined,
        spaceId: undefined,
    },
} satisfies UserOpsState)

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
                            state.userOps[sender] ??= { ...initialState }
                            state.userOps[sender].rejectedSponsorshipReason = reason
                        },
                        undefined,
                        'userOps/setRejectedSponsorshipReason',
                    )
                },
                setCurrent: (args: { sender: string } & Partial<OpDetails>) => {
                    set(
                        (state) => {
                            const {
                                sender,
                                op,
                                value,
                                decodedCallData,
                                functionHashForPaymasterProxy,
                                spaceId,
                            } = args
                            state.userOps[sender] ??= { ...initialState }
                            state.userOps[sender].current = {
                                ...state.userOps[sender].current,
                                ...(op && { op: structuredClone(op) }),
                                ...(value !== undefined && { value }),
                                ...(decodedCallData !== undefined && { decodedCallData }),
                                ...(functionHashForPaymasterProxy !== undefined && {
                                    functionHashForPaymasterProxy,
                                }),
                                ...(spaceId !== undefined && { spaceId }),
                            }
                        },
                        undefined,
                        'userOps/setCurrent',
                    )
                },
                setPending: ({ sender, hash }) => {
                    set(
                        (state) => {
                            state.userOps[sender] ??= { ...initialState }
                            const current = state.userOps[sender].current
                            state.userOps[sender].pending = {
                                ...current,
                                hash,
                            }
                        },
                        undefined,
                        'userOps/setPending',
                    )
                },
                setPromptResponse: (sender, promptResponse) => {
                    set(
                        (state) => {
                            if (!sender) return
                            state.userOps[sender] ??= { ...initialState }
                            state.userOps[sender].promptResponse = promptResponse
                        },
                        undefined,
                        'userOps/setPromptResponse',
                    )
                },
                setOperationAttempt: (sender, attempt) => {
                    set(
                        (state) => {
                            state.userOps[sender] ??= { ...initialState }
                            state.userOps[sender].operationAttempt = attempt
                        },
                        undefined,
                        'userOps/setOperationAttempt',
                    )
                },
                setSequenceName: (sender, sequenceName) => {
                    set(
                        (state) => {
                            state.userOps[sender] ??= { ...initialState }
                            state.userOps[sender].sequenceName = sequenceName
                        },
                        undefined,
                        'userOps/setSequenceName',
                    )
                },
                setRetryDetails: (sender, retryDetails) => {
                    set(
                        (state) => {
                            state.userOps[sender] ??= { ...initialState }
                            state.userOps[sender].retryDetails = retryDetails
                        },
                        undefined,
                        'userOps/setRetryDetails',
                    )
                },
                setPromptUser: (sender, promptUser) => {
                    set(
                        (state) => {
                            state.userOps[sender] ??= { ...initialState }
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
                        'userOps/reset',
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

export const selectUserOpsByAddress = (address: string | undefined, state?: State) => {
    if (!address) return { ...initialState }
    return (state ?? userOpsStore.getState()).userOps[address] ?? { ...initialState }
}
