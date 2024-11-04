import { BigNumberish } from 'ethers'
import { IUserOperation } from 'userop'
import { create } from 'zustand'
import { FunctionHash } from './types'
import { decodeCallData } from './utils'
import { TownsSimpleAccount } from './TownsSimpleAccount'
import { Space } from '@river-build/web3'

export enum PaymasterErrorCode {
    PAYMASTER_LIMIT_REACHED = 'PAYMASTER_LIMIT_REACHED',
    DAILY_LIMIT_REACHED = 'DAILY_LIMIT_REACHED',
}

type State = {
    currOp: IUserOperation | undefined
    currOpValue: BigNumberish | undefined
    currOpDecodedCallData: ReturnType<typeof decodeCallData<FunctionHash>> | undefined
    rejectedSponsorshipReason: PaymasterErrorCode | undefined
    retryDetails?: {
        type: 'gasTooLow'
        data: unknown
    }
}

type Actions = {
    saveOp: (args: {
        op: IUserOperation
        value: BigNumberish | undefined
        type: FunctionHash | undefined
        builder: TownsSimpleAccount
        space: Space | undefined
    }) => void
    setConfirmAndDeny: (confirm: () => void, deny: () => void) => void
    setRejectedSponsorshipReason: (reason: PaymasterErrorCode | undefined) => void
    confirm: (() => void) | undefined
    deny: (() => void) | undefined
    clear: () => void
}

const initialState: State & Pick<Actions, 'confirm' | 'deny'> = Object.freeze({
    currOpValue: undefined,
    retryDetails: undefined,
    currOp: undefined,
    currOpDecodedCallData: undefined,
    rejectedSponsorshipReason: undefined,
    confirm: undefined,
    deny: undefined,
})

export const userOpsStore = create<State & Actions>((set) => ({
    ...initialState,
    setRejectedSponsorshipReason: (reason) => set({ rejectedSponsorshipReason: reason }),
    saveOp: ({ op, type, value, builder, space }) =>
        set({
            currOp: op,
            currOpDecodedCallData: decodeCallData({
                callData: op.callData,
                functionHash: type,
                builder,
                space,
            }),
            currOpValue: value,
        }),
    setConfirmAndDeny: (confirm, deny) => set({ confirm, deny }),
    clear: () =>
        set({
            ...initialState,
        }),
}))
