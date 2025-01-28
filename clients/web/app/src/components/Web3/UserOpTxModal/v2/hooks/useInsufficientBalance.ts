import { isNegativeValueException, totalCostOfUserOp, userOpsStore } from '@towns/userops'
import { useMemo } from 'react'
import { BigNumberish } from 'ethers'
import { adjustValueRelativeToBalance } from '@towns/userops/src/middlewares'

export function useInsufficientBalance(args: {
    balance: bigint | undefined
    gasLimit: BigNumberish
    preVerificationGas: BigNumberish
    verificationGasLimit: BigNumberish
    gasPrice: BigNumberish
    currOpDecodedCallData: ReturnType<
        typeof userOpsStore.getState
    >['userOps']['xxx']['current']['decodedCallData']
    value?: BigNumberish
}): boolean {
    const {
        balance,
        gasLimit,
        preVerificationGas,
        verificationGasLimit,
        gasPrice,
        value,
        currOpDecodedCallData,
    } = args

    const isTransferEth = currOpDecodedCallData?.functionHash === 'transferEth'

    return useMemo(() => {
        if (isTransferEth && value && balance !== undefined) {
            // when transferring eth, if a user selects the max amount in their wallet,
            // we're going to adjust the value to be max - gas cost
            // so this should always be false (user has enough balance)
            // except in the case where the gas cost is greater than the balance and results in a negative value
            // in that case, we should stop the tx from proceeding
            try {
                adjustValueRelativeToBalance({
                    balance,
                    value,
                    callGasLimit: gasLimit,
                    preVerificationGas,
                    verificationGasLimit,
                    maxFeePerGas: gasPrice,
                })
                return false
            } catch (e) {
                if (isNegativeValueException(e)) {
                    return true
                }
                throw e
            }
        } else {
            const cost = totalCostOfUserOp({
                gasLimit,
                preVerificationGas,
                verificationGasLimit,
                gasPrice,
                value,
            })
            return balance === undefined ? false : balance < cost.toBigInt()
        }
    }, [
        balance,
        gasLimit,
        gasPrice,
        isTransferEth,
        preVerificationGas,
        value,
        verificationGasLimit,
    ])
}
