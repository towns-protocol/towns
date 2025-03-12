import { isERC1155, isERC721 } from './tokenTypes'
import { decodeFunctionData, encodeFunctionData, isHex, parseAbi } from 'viem'
import { PublicClient } from 'viem'

const abi = [
    'function transferFrom(address from, address to, uint256 tokenId) external',
    'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) external',
] as const

export async function getTransferCallData(args: {
    recipient: string
    tokenId: string
    contractAddress: string
    fromAddress: string
    quantity?: number
    client: PublicClient
}) {
    const { recipient, tokenId, contractAddress, client, quantity, fromAddress } = args

    if (isNaN(Number(tokenId))) {
        throw new Error('Token ID is not a number')
    }

    try {
        if (await isERC721(contractAddress, client)) {
            return encodeFunctionData({
                abi: parseAbi(abi),
                functionName: 'transferFrom',
                args: [fromAddress as `0x${string}`, recipient as `0x${string}`, BigInt(tokenId)],
            })
        }
    } catch (error) {
        console.error('Error checking if ERC721', error)
    }

    try {
        const _isERC1155 = await isERC1155(contractAddress, client)

        if (_isERC1155 && !quantity) {
            throw new Error('Quantity is required for ERC1155 transfers')
        } else if (_isERC1155 && quantity) {
            if (isNaN(quantity)) {
                throw new Error('Quantity is not a number')
            }
            return encodeFunctionData({
                abi: parseAbi(abi),
                functionName: 'safeTransferFrom',
                args: [
                    fromAddress as `0x${string}`,
                    recipient as `0x${string}`,
                    BigInt(tokenId),
                    BigInt(quantity),
                    '0x',
                ],
            })
        }
        throw new Error('Invalid token type')
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
