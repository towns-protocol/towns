import { BASE_MAINNET, BASE_SEPOLIA } from '@river-build/web3'
import { Signer } from 'ethers'
import { base, baseSepolia, foundry } from 'viem/chains'

export async function getChain(signer: Signer) {
    const network = await signer.provider?.getNetwork()
    if (network?.chainId === BASE_MAINNET) {
        return base
    }
    if (network?.chainId === BASE_SEPOLIA) {
        return baseSepolia
    }
    return foundry
}
