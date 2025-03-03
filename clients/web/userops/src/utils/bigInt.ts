export const bigIntMax = (...args: bigint[]): bigint => {
    if (!args.length) {
        throw new Error('bigIntMax requires at least one argument')
    }

    return args.reduce((m, c) => (m > c ? m : c))
}

export const bigIntMultiply = (base: bigint, multiplier: number) => {
    // Get decimal places of b. Max decimal places is defined by the MultiplerSchema.
    const decimalPlaces = multiplier.toString().split('.')[1]?.length ?? 0
    const val = base * BigInt(multiplier * 10 ** decimalPlaces) + BigInt(10 ** decimalPlaces - 1)

    return val / BigInt(10 ** decimalPlaces)
}
