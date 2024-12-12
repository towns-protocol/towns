import { costOfGas, totalCostOfUserOp } from '@towns/userops'
import { BigNumber, BigNumberish } from 'ethers'
import { formatUnitsToFixedLength } from 'hooks/useBalance'

export function usePriceBreakdown(args: {
    gasLimit: BigNumberish
    preVerificationGas: BigNumberish
    verificationGasLimit: BigNumberish
    gasPrice: BigNumberish
    balanceIsLessThanCost: boolean
    value?: BigNumberish
}) {
    const {
        gasLimit,
        preVerificationGas,
        verificationGasLimit,
        gasPrice,
        value,
        balanceIsLessThanCost,
    } = args
    const gasCost = costOfGas({
        gasLimit,
        preVerificationGas,
        verificationGasLimit,
        gasPrice,
    })

    const totalCost = totalCostOfUserOp({
        gasLimit,
        preVerificationGas,
        verificationGasLimit,
        gasPrice,
        value,
    })

    const gasInEth = formatUnitsToFixedLength(gasCost.toBigInt())

    const currOpValueInEth = value
        ? formatUnitsToFixedLength(BigNumber.from(value).toBigInt())
        : undefined

    const totalInEth = formatUnitsToFixedLength(
        totalCost.toBigInt(),
        18,
        balanceIsLessThanCost ? 18 : 5,
    )

    return {
        gasCost,
        totalCost,
        gasInEth,
        currOpValueInEth,
        totalInEth,
    }
}
