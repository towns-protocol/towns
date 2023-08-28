import { withCorsHeaders } from 'worker-common'
import { throwCustomError } from '../router'
import { GetNftsAlchemyResponse, GetNftsResponse, TokenProviderRequest } from '../types'

const fetchAlchemyNfts = async (
    rpcUrl: string,
    wallet: string,
    pageKey: string,
): Promise<GetNftsAlchemyResponse> => {
    let url = `${rpcUrl}/getNFTs?owner=${wallet}&pageKey=${pageKey}`
    // alchemy changed things up and filter doesn't work on goerli
    if (rpcUrl.includes('eth-mainnet')) {
        url = url + '&filters[]=SPAM'
    }

    const response = await fetch(url)
    if (!response.ok) {
        throwCustomError(
            (await response.text?.()) || 'could not fetch from alchemy',
            response.status,
        )
    }
    return response.json()
}

export const getNftsForOwner = async (request: TokenProviderRequest) => {
    const { rpcUrl, params, query } = request

    const { wallet } = params || {}

    const pageKey = query?.pageKey || ''

    let json: GetNftsAlchemyResponse | GetNftsResponse = await fetchAlchemyNfts(
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

function getContractMetadata(response: GetNftsAlchemyResponse): GetNftsResponse {
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
