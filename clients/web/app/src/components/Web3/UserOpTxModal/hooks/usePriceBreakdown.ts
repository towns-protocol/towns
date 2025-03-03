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
        gasLimit: BigNumber.from(gasLimit).toBigInt(),
        preVerificationGas: BigNumber.from(preVerificationGas).toBigInt(),
        verificationGasLimit: BigNumber.from(verificationGasLimit).toBigInt(),
        gasPrice: BigNumber.from(gasPrice).toBigInt(),
    })

    const totalCost = totalCostOfUserOp({
        gasLimit: BigNumber.from(gasLimit).toBigInt(),
        preVerificationGas: BigNumber.from(preVerificationGas).toBigInt(),
        verificationGasLimit: BigNumber.from(verificationGasLimit).toBigInt(),
        gasPrice: BigNumber.from(gasPrice).toBigInt(),
        value: value ? BigNumber.from(value).toBigInt() : undefined,
    })

    const gasInEth = formatUnitsToFixedLength(gasCost)

    const currOpValueInEth = value
        ? formatUnitsToFixedLength(BigNumber.from(value).toBigInt())
        : undefined

    const totalInEth = formatUnitsToFixedLength(totalCost, 18, balanceIsLessThanCost ? 18 : 5)

    return {
        gasCost,
        totalCost,
        gasInEth,
        currOpValueInEth,
        totalInEth,
    }
}
