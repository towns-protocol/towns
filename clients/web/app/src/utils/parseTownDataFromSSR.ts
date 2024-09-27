import { z } from 'zod'

declare global {
    interface Window {
        __SSR__: string | undefined
    }
}

const SpaceInfoSchema = z
    .object({
        townData: z.object({
            name: z.string(),
            shortDescription: z.string(),
            longDescription: z.string(),
            tokenId: z.number(),
            createdAt: z.number(),
            uri: z.string(),
            networkId: z.string(),
            address: z.string(),
            owner: z.string(),
            disabled: z.boolean(),
        }),
        route: z.string(),
    })
    .optional()

export const getTownDataFromSSR = () => {
    try {
        const result = SpaceInfoSchema.safeParse(JSON.parse(window.__SSR__ || '{}'))

        if (result.success) {
            console.log(`getTownDataFromSSR`, result.data)
            return result.data
        }
    } catch (error) {
        console.log(`[getTownDataFromSSR] unable to parse`)
        return undefined
    }
}
