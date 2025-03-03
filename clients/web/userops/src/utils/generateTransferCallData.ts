import { utils } from 'ethers'
import { BundlerJsonRpcProvider } from 'userop'
import { isERC1155, isERC721 } from './tokenTypes'
import { decodeFunctionData, isHex, parseAbi } from 'viem'

const abi = [
    'function transferFrom(address from, address to, uint256 tokenId) external',
    'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) external',
] as const
const iface = new utils.Interface(abi)

export async function getTransferCallData(args: {
    recipient: string
    tokenId: string
    contractAddress: string
    provider: BundlerJsonRpcProvider
    fromAddress: string
    quantity?: number
}): Promise<string | undefined> {
    const { recipient, tokenId, contractAddress, provider, quantity, fromAddress } = args

    try {
        if (await isERC721(contractAddress, provider)) {
            return iface.encodeFunctionData('transferFrom', [fromAddress, recipient, tokenId])
        }
    } catch (error) {
        console.error('Error checking if ERC721', error)
    }

    try {
        const _isERC1155 = await isERC1155(contractAddress, provider)

        if (_isERC1155 && !quantity) {
            throw new Error('Quantity is required for ERC1155 transfers')
        } else if (_isERC1155) {
            return iface.encodeFunctionData('safeTransferFrom', [
                fromAddress,
                recipient,
                tokenId,
                quantity,
                '0x',
            ])
        }
    } catch (error) {
        console.error('Error checking if ERC1155', error)
    }

    return undefined
}

export function decodeTransferCallData(callData: string) {
    if (!isHex(callData)) {
        throw new Error('[decodeTransferCallData]::callData is not a valid hex string')
    }
    return decodeFunctionData({
        abi: parseAbi(abi),
        data: callData,
    })
}
