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
    smartAccountAddress: Address | undefined
    retryType: 'preVerification' | undefined
    confirm: () => void
    deny: () => void
    clear: () => void
}>((set) => ({
    currOpGas: undefined,
    smartAccountAddress: undefined,
    retryType: undefined,
    confirm: () => {},
    deny: () => {},
    clear: () =>
        set({
            currOpGas: undefined,
            retryType: undefined,
            confirm: () => {},
            deny: () => {},
        }),
}))
