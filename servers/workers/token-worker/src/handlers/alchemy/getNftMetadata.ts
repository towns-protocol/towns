import { GetNftMetadataResponse, GetNftOwnersResponse } from '../../types'
import {
    fetchAlchemyNftMetadata,
    fetchAlchemyNftOwners,
    generateAlchemyRpcUrl,
    getChainFromChainId,
} from '../../utils'

export async function getNftMetadata(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    alchemyApiKey: string,
): Promise<GetNftMetadataResponse & GetNftOwnersResponse> {
    const chain = getChainFromChainId(chainId)
    if (!chain) {
        throw new Error(`invalid chainId:: ${chainId}`)
    }

    const rpcUrl = generateAlchemyRpcUrl(chain.vChain.id, alchemyApiKey)
    const owners = await fetchAlchemyNftOwners(rpcUrl, contractAddress, tokenId)
    const nft = await fetchAlchemyNftMetadata(rpcUrl, contractAddress, tokenId)
    return { ...owners, ...nft }
}
