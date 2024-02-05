import { Environment, withCorsHeaders } from 'worker-common'
import { throwCustomError } from '../../router'
import {
    GetCollectionsForOwnerResponse,
    GetContractsForOwnerAlchemyResponse,
    TokenProviderRequest,
} from '../../types'

const fetchAlchemyNfts = async (
    rpcUrl: string,
    wallet: string,
    pageKey: string,
): Promise<GetContractsForOwnerAlchemyResponse> => {
    let url = `${rpcUrl}/getContractsForOwner?owner=${wallet}`

    if (pageKey) {
        url = url.concat(`&pageKey=${pageKey}`)
    }

    // alchemy updated so spam filter is only available for paid levels
    // And if you try to add the filters w/out paid, it errors!
    // if (rpcUrl.includes('eth-mainnet')) {
    //     url = url.concat('&includeFilters[]=SPAM')
    // }

    try {
        const response = await fetch(url)
        if (!response.ok) {
            throwCustomError(
                (await response.text?.()) || 'could not fetch from alchemy',
                response.status,
            )
        }

        return response.json()
    } catch (error) {
        throw throwCustomError(JSON.stringify(error), (error as unknown as { code: number })?.code)
    }
}

export const getCollectionsForOwner = async (request: TokenProviderRequest, env: Environment) => {
    const { rpcUrl, params, query } = request

    const { wallet } = params || {}

    const pageKey = query?.pageKey || ''

    const json = await fetchAlchemyNfts(rpcUrl, wallet, pageKey)
    json.contracts = withOpenSeaImage(json.contracts)

    try {
        while (json.pageKey) {
            const res = await fetchAlchemyNfts(rpcUrl, wallet, json.pageKey || '')
            json.pageKey = res.pageKey
            json.contracts = [...json.contracts, ...withOpenSeaImage(res.contracts)]
        }

        const collectionResponseForClient: GetCollectionsForOwnerResponse = {
            totalCount: json.totalCount,
            collections: json.contracts,
        }

        const body = JSON.stringify(collectionResponseForClient)

        const headers = { 'Content-type': 'application/json', ...withCorsHeaders(request, env) }
        return new Response(body, { headers })
    } catch (error) {
        return new Response(`Error ${JSON.stringify(error)}`, { status: 500 })
    }
}

function withOpenSeaImage(
    contracts: GetContractsForOwnerAlchemyResponse['contracts'],
): GetContractsForOwnerAlchemyResponse['contracts'] {
    return contracts.map((contract) => {
        // TODO: need to update alchemy sdk to get proper types
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { openSeaMetadata, ...rest } = contract

        return {
            ...rest,
            imageUrl: openSeaMetadata?.imageUrl,
        }
    })
}
