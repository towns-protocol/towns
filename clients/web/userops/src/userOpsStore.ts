import { Address } from '@river-build/web3'
import { BigNumberish } from 'ethers'
import { create } from 'zustand'

export type UserOpGas = {
    maxFeePerGas: BigNumberish
    maxPriorityFeePerGas: BigNumberish
    preverificationGas: BigNumberish
    verificationGasLimit: BigNumberish
    callGasLimit: BigNumberish
}

export const userOpsStore = create<{
    currOpGas: UserOpGas | undefined
    currOpValue: BigNumberish | undefined
    smartAccountAddress: Address | undefined
    retryType: 'preVerification' | undefined
    confirm: () => void
    deny: () => void
    clear: () => void
}>((set) => ({
    currOpGas: undefined,
    currOpValue: undefined,
    smartAccountAddress: undefined,
    retryType: undefined,
    confirm: () => {},
    deny: () => {},
    clear: () =>
        set({
            currOpGas: undefined,
            currOpValue: undefined,
            retryType: undefined,
            confirm: () => {},
            deny: () => {},
        }),
}))
