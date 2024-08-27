import { useQuery } from '@tanstack/react-query'
import { fetchSpaceImage, fetchUserProfileImage } from 'api/lib/fetchImage'

export const SPACE_IMAGE_QUERY_KEY = 'stream_metadata_spaceIcon'
export const USER_PROFILE_IMAGE_QUERY_KEY = 'stream_metadata_avatar'
export type FetchImageResourceType = 'spaceIcon' | 'avatar'

export function useFetchImage(resourceId: string | undefined, type: FetchImageResourceType) {
    return useQuery({
        queryKey: [`stream_metadata_${type}`, resourceId],
        queryFn: async () => {
            if (type === 'spaceIcon') {
                return fetchSpaceImage(resourceId)
            }
            if (type === 'avatar') {
                return fetchUserProfileImage(resourceId)
            }
        },
        enabled: !!resourceId,
    })
}
