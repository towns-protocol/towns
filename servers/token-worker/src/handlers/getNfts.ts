import { withCorsHeaders } from '../cors'
import { RequestWithAlchemyConfig } from '../types'

export const getNftsForOwner = async (request: RequestWithAlchemyConfig) => {
    const { rpcUrl, params } = request

    const { wallet } = params || {}

    const response = await fetch(`${rpcUrl}/getNFTs?owner=${wallet}`)

    const body = JSON.stringify(await response.json())

    const headers = { 'Content-type': 'application/json', ...withCorsHeaders(request) }
    return new Response(body, { headers })
}
