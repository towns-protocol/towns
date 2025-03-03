import { Hex } from 'viem'

export function isSponsoredOp(args: { paymasterAndData: Hex | undefined }) {
    return args.paymasterAndData !== undefined && args.paymasterAndData !== '0x'
}
