import { isAddress } from 'viem'
import { generatePublicClients } from '../utils'
import { TokenType } from '../types'
import { erc165Abi, interfaceIds } from '../abis'
/**
 * Returns the token type for a given address
 * if 721 and 1155 fail, ERC20 is assumed
 */
export async function getTokenType(address: string | undefined, alchemyApiKey: string) {
    if (!address || !isAddress(address)) {
        return
    }

    const clients = generatePublicClients(alchemyApiKey)
    const readContracts = clients.map((client) => client.readContract)

    const erc721Config = {
        address,
        abi: erc165Abi,
        functionName: 'supportsInterface',
        args: [interfaceIds.erc721],
        chainId: 84532,
    } as const

    const erc1155Config = {
        address,
        abi: erc165Abi,
        functionName: 'supportsInterface',
        args: [interfaceIds.erc1155],
        chainId: 84532,
    } as const

    let type: TokenType | undefined

    try {
        await Promise.any(readContracts.map(async (rc) => await rc(erc721Config)))
        type = TokenType.ERC721
    } catch (error) {
        // catch aggregate error, token not found
        console.log(`ERC721 data not found for ${address}`, error)
    }

    if (!type) {
        try {
            await Promise.any(readContracts.map((rc) => rc(erc1155Config)))
            type = TokenType.ERC1155
        } catch (error) {
            // catch aggregate error, token not found
            console.log(`ERC1155 data not found ${address}`, error)
        }
    }

    // what check for erc20?
    if (!type) {
        type = TokenType.ERC20
    }

    return type
}
