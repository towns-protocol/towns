import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '../apiClient'

export function getUnfurlContent(urlsArray: string[]) {
    const UNFURL_SERVER_URL = import.meta.env.VITE_UNFURL_SERVER_URL
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
    return useQuery(urlsArray, () => getUnfurlContent(urlsArray), {
        select: ({ data }) => data,
        enabled,
    })
}
