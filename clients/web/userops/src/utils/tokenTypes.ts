import { PublicClient } from 'viem'
import { parseAbi } from 'viem'
const abi = ['function supportsInterface(bytes4 interfaceId) external view returns (bool)'] as const

export async function isERC721(contractAddress: string, client: PublicClient): Promise<boolean> {
    const ERC721_INTERFACE_ID = '0x80ac58cd'
    try {
        // Call the supportsInterface function
        const result = await client.readContract({
            address: contractAddress as `0x${string}`,
            abi: parseAbi(abi),
            functionName: 'supportsInterface',
            args: [ERC721_INTERFACE_ID as `0x${string}`],
        })

        return result
    } catch (error) {
        console.error('Error checking ERC721 interface:', error)
        return false
    }
}

export async function isERC1155(contractAddress: string, client: PublicClient): Promise<boolean> {
    const ERC1155_INTERFACE_ID = '0xd9b67a26'
    try {
        // Call the supportsInterface function
        const result = await client.readContract({
            address: contractAddress as `0x${string}`,
            abi: parseAbi(abi),
            functionName: 'supportsInterface',
            args: [ERC1155_INTERFACE_ID as `0x${string}`],
        })

        return result
    } catch (error) {
        console.error('Error checking ERC1155 interface:', error)
        return false
    }
}
