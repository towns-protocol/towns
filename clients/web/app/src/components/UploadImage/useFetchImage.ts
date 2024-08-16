import { isSpaceStreamId, isUserStreamId } from '@river-build/sdk'

import { useQuery } from '@tanstack/react-query'
import { fetchSpaceImage } from 'api/lib/fetchImage'

export const SPACE_IMAGE_QUERY_KEY = 'spaceImage'
export type FetchImageResourceType = 'spaceIcon' | 'avatar'

export function useFetchImage(resourceId: string | undefined, type: FetchImageResourceType) {
    return useQuery({
        queryKey: [SPACE_IMAGE_QUERY_KEY, resourceId],
        queryFn: async () =>
            type === 'spaceIcon'
                ? fetchSpaceImage(resourceId)
                : type === 'avatar'
                ? /* todo */ null
                : null,
        enabled: !!resourceId && (isSpaceStreamId(resourceId) || isUserStreamId(resourceId)),
    })
}
