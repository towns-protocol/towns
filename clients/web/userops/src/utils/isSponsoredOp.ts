import { Hex } from 'viem'

export function isSponsoredOp(args: {
    entryPointVersion: '0.6' | '0.7'
    paymasterAndData: Hex | undefined
    paymasterData: Hex | undefined
}) {
    if (args.entryPointVersion === '0.6') {
        return args.paymasterAndData !== undefined && args.paymasterAndData !== '0x'
    } else {
        return args.paymasterData !== undefined
    }
}
