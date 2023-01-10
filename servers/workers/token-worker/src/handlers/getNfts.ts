import { withCorsHeaders } from '../../../common/cors'
import { throwCustomError } from '../router'
import { AccurateNftResponse, ContractMetadataResponse, RequestWithAlchemyConfig } from '../types'

const fetchAlchemyNfts = async (
    rpcUrl: string,
    wallet: string,
    pageKey: string,
): Promise<AccurateNftResponse> => {
    const response = await fetch(
        `${rpcUrl}/getNFTs?owner=${wallet}&pageKey=${pageKey}&filters[]=SPAM`,
    )
    if (!response.ok) {
        throwCustomError(
            (await response.text?.()) || 'could not fetch from alchemy',
            response.status,
        )
    }
    return response.json()
}

export const getNftsForOwner = async (request: RequestWithAlchemyConfig) => {
    const { rpcUrl, params, query } = request

    const { wallet } = params || {}

    const pageKey = query?.pageKey || ''

    let json: AccurateNftResponse | ContractMetadataResponse = await fetchAlchemyNfts(
        rpcUrl,
        wallet,
        pageKey,
    )

    if (query && 'all' in query) {
        while (json.pageKey) {
            const res = await fetchAlchemyNfts(rpcUrl, wallet, json.pageKey || '')
            json.pageKey = res.pageKey
            json.ownedNfts = [...json.ownedNfts, ...res.ownedNfts]
        }
    }

    if (query && 'contractMetadata' in query) {
        json = getContractMetadata(json)
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
                const { name, symbol, tokenType, openSea } = nft.contractMetadata || {}
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
