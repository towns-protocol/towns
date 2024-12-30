import { z } from 'zod'
import { env } from 'utils'
const zodSchema = z.object({
    data: z.array(
        z.object({
            symbol: z.string(),
            prices: z.array(
                z.object({
                    value: z.string(),
                    currency: z.string(),
                    lastUpdatedAt: z.string(),
                }),
            ),
        }),
    ),
})

export async function fetchEthPrice() {
    const priceApiUrl = env.VITE_TOKEN_PRICES_API_URL
    if (!priceApiUrl) {
        throw new Error('fetchEthPrice: VITE_TOKEN_PRICES_API_URL is not set')
    }

    const response = await fetch(`${priceApiUrl}/tokens/by-symbol?symbols=ETH`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    const data = await response.json()
    const parsed = zodSchema.safeParse(data)

    if (!parsed.success) {
        throw new Error(`Failed to fetch ETH price, zod parse failed: ${parsed.error}`)
    }

    const priceInUsd = parsed.data.data[0].prices[0].value

    return priceInUsd
}
