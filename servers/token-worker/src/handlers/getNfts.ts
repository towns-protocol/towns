import { withCorsHeaders } from '../cors'
import { AccurateNftResponse, ContractMetadataResponse, RequestWithAlchemyConfig } from '../types'

export const getNftsForOwner = async (request: RequestWithAlchemyConfig) => {
    const { rpcUrl, params, query } = request

    const { wallet } = params || {}

    const pageKey = query?.pageKey || ''
    const response = await fetch(`${rpcUrl}/getNFTs?owner=${wallet}&pageKey=${pageKey}`)
    let json = await response.json()

    if (query && 'contractMetadata' in query) {
        json = getContractMetadata(json as AccurateNftResponse)
    }

    const body = JSON.stringify(json)

    const headers = { 'Content-type': 'application/json', ...withCorsHeaders(request) }
    return new Response(body, { headers })
}

function getContractMetadata(response: AccurateNftResponse): ContractMetadataResponse {
    const { ownedNfts, ...rest } = response
    return {
        ...rest,
        ownedNftsContract: ownedNfts
            .map((nft) => {
                const { name, symbol, tokenType, openSea } = nft.contractMetadata
                return {
                    name,
                    address: nft.contract.address,
                    symbol,
                    tokenType,
                    imageUrl: openSea?.imageUrl,
                }
            })
            .filter((data, index, self) => {
                return index === self.findIndex((contract) => data.address === contract.address)
            }),
    }
}
