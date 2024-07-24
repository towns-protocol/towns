import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { env } from 'utils'
import { MONTH_MS, SECOND_MS } from 'data/constants'
import { axiosClient } from '../apiClient'

const DEBUG_LATENCY = import.meta.env.DEV && false

const unfurledLinkSchema = z.object({
    url: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    image: z
        .object({
            width: z.number().optional(),
            height: z.number().optional(),
            url: z.string(),
        })
        .optional(),
})

const unfurledLinkResponseSchema = z.object({
    data: z.array(unfurledLinkSchema),
})

export async function getUnfurlContent(urlsArray: string[]) {
    const UNFURL_SERVER_URL = env.VITE_UNFURL_SERVER_URL

    if (DEBUG_LATENCY) {
        await new Promise((resolve) => setTimeout(resolve, SECOND_MS * 2))
    }

    const encodedUrls = urlsArray.map((url) => `&url=${encodeURIComponent(url)}`)
    const response = await axiosClient.get(`${UNFURL_SERVER_URL}?${encodedUrls.join('')}`)
    const parsed = unfurledLinkResponseSchema.safeParse(response)

    if (parsed.success) {
        return parsed.data
    } else if (parsed.error) {
        console.error('Error parsing unfurled link response:', parsed.error)
    }
}

export function useUnfurlContent({
    urlsArray,
    enabled,
}: {
    urlsArray: string[]
    enabled: boolean
}) {
    // using urlsArray as query key, maybe need to add event id too?
    return useQuery({
        queryKey: urlsArray,
        queryFn: () => getUnfurlContent(urlsArray),
        select: (response) => {
            return response?.data
        },
        enabled,
        // unfurl content doesn't need to be refetched
        // if user edits their message, that's fine, it's a new query key so will be fetched
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: MONTH_MS,
        gcTime: MONTH_MS,
    })
}
