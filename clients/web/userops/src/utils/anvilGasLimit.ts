import { LOCALHOST_CHAIN_ID } from '@river-build/web3'

// w/ pimlico alto bundler it doesn't estimate high enough, why? quick fix
export function doubleGasIfLocalAnvil(chainId: number | undefined, gas: bigint) {
    if (chainId === LOCALHOST_CHAIN_ID) {
        return gas * 2n
    }
    return gas
}
