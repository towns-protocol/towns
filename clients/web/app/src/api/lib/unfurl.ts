import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '../apiClient'

export function getUnfurlContent(urlsArray: string[]) {
    const encodedUrls = urlsArray.map((url) => `&url=${encodeURIComponent(url)}`)
    return axiosClient.get(`/unfurl?${encodedUrls}`)
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
