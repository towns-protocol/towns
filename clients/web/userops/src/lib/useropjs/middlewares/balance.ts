import { BundlerJsonRpcProvider } from 'userop'
import { BigNumber, BigNumberish } from 'ethers'

export async function balanceOf(address: string, provider: BundlerJsonRpcProvider) {
    return provider.getBalance(address)
}

export function sumOfGas(args: {
    gasLimit: BigNumberish
    preVerificationGas: BigNumberish
    verificationGasLimit: BigNumberish
}) {
    return BigNumber.from(args.gasLimit)
        .add(BigNumber.from(args.preVerificationGas))
        .add(BigNumber.from(args.verificationGasLimit))
}

export function costOfGas(args: {
    gasLimit: BigNumberish
    preVerificationGas: BigNumberish
    verificationGasLimit: BigNumberish
    gasPrice: BigNumberish
}) {
    return sumOfGas(args).mul(BigNumber.from(args.gasPrice))
}

export function totalCostOfUserOp(args: {
    gasLimit: BigNumberish
    preVerificationGas: BigNumberish
    verificationGasLimit: BigNumberish
    gasPrice: BigNumberish
    value?: BigNumberish
}) {
    const gasCost = costOfGas(args)

    const totalCost = gasCost.add(BigNumber.from(args.value ?? 0))

    return totalCost
}
