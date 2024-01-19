import { useQuery } from '@tanstack/react-query'
import { env } from 'utils'
import { axiosClient } from '../apiClient'

export function getUnfurlContent(urlsArray: string[]) {
    const UNFURL_SERVER_URL = env.VITE_UNFURL_SERVER_URL
    const encodedUrls = urlsArray.map((url) => `&url=${encodeURIComponent(url)}`)
    return axiosClient.get(`${UNFURL_SERVER_URL}?${encodedUrls}`)
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
        select: ({ data }) => data,
        enabled,
        // unfurl content doesn't need to be refetched
        // if user edits their message, that's fine, it's a new query key so will be fetched
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 60 * 60 * 24,
    })
}
