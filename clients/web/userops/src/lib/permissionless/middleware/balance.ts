export function sumOfGas(args: {
    gasLimit: bigint
    preVerificationGas: bigint
    verificationGasLimit: bigint
}) {
    return args.gasLimit + args.preVerificationGas + args.verificationGasLimit
}

export function costOfGas(args: {
    gasLimit: bigint
    preVerificationGas: bigint
    verificationGasLimit: bigint
    gasPrice: bigint
}) {
    return sumOfGas(args) * args.gasPrice
}

export function totalCostOfUserOp(args: {
    gasLimit: bigint
    preVerificationGas: bigint
    verificationGasLimit: bigint
    gasPrice: bigint
    value?: bigint
}) {
    const gasCost = costOfGas(args)

    const totalCost = gasCost + (args.value ?? 0n)

    return totalCost
}
