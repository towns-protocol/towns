import { GetNftMetadataResponse, GetNftOwnersResponse } from '../../types'
import { fetchAlchemyNftMetadata, fetchAlchemyNftOwners, generateAlchemyRpcUrl } from '../../utils'

export async function getNftMetadata(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    supportedChainIds: number[],
    alchemyApiKey: string,
): Promise<GetNftMetadataResponse & GetNftOwnersResponse> {
    const rpcUrl = generateAlchemyRpcUrl(supportedChainIds, chainId, alchemyApiKey)
    const owners = await fetchAlchemyNftOwners(rpcUrl, contractAddress, tokenId)
    const nft = await fetchAlchemyNftMetadata(rpcUrl, contractAddress, tokenId)
    return { ...owners, ...nft }
}
