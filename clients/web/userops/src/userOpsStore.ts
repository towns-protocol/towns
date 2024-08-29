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
    retryDetails:
        | {
              type: 'gasTooLow'
              data: unknown
          }
        | undefined
    confirm: () => void
    deny: () => void
    clear: () => void
}>((set) => ({
    currOpGas: undefined,
    currOpValue: undefined,
    retryDetails: undefined,
    confirm: () => {},
    deny: () => {},
    clear: () =>
        set({
            currOpGas: undefined,
            currOpValue: undefined,
            retryDetails: undefined,
            confirm: () => {},
            deny: () => {},
        }),
}))
