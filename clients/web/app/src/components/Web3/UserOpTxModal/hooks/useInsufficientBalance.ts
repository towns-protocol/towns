import { totalCostOfUserOp } from '@towns/userops'
import { useMemo } from 'react'
import { BigNumberish } from 'ethers'

export function useInsufficientBalance(args: {
    balance: bigint | undefined
    gasLimit: BigNumberish
    preVerificationGas: BigNumberish
    verificationGasLimit: BigNumberish
    gasPrice: BigNumberish
    value?: BigNumberish
}): boolean {
    const { balance, gasLimit, preVerificationGas, verificationGasLimit, gasPrice, value } = args

    return useMemo(() => {
        const cost = totalCostOfUserOp({
            gasLimit,
            preVerificationGas,
            verificationGasLimit,
            gasPrice,
            value,
        })
        return balance === undefined ? false : balance < cost.toBigInt()
    }, [balance, gasLimit, gasPrice, preVerificationGas, value, verificationGasLimit])
}
