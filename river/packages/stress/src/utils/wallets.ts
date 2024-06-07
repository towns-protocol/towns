import { ethers } from 'ethers'

/**
 * Generates a range of wallets from a seed phrase using ethers HDNode.
 * @param seedPhrase The mnemonic seed phrase.
 * @param start The starting index of the wallet range.
 * @param end The ending index of the wallet range.
 * @returns An array of wallet objects with public and private keys.
 */
export function generateWalletsFromSeed(
    seedPhrase: string,
    start: number,
    end: number,
): ethers.Wallet[] {
    if (start > end) {
        throw new Error('Start index must be less than or equal to end index.')
    }

    // Convert the seed phrase to a root HDNode.
    const root = ethers.utils.HDNode.fromMnemonic(seedPhrase)

    // Generate wallets for the range from N to M.
    const wallets: ethers.Wallet[] = []
    for (let i = start; i < end; i++) {
        // Derive the path for the current index. Standard Ethereum path is used (`m/44'/60'/0'/0/x`)
        const derivedNode = root.derivePath(`m/44'/60'/0'/0/${i}`)
        const wallet = new ethers.Wallet(derivedNode.privateKey)
        wallets.push(wallet)
    }

    return wallets
}
