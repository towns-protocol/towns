import { contractAddressFromSpaceId, isSpaceStreamId, isUserId } from '@river-build/sdk'

import { axiosClient } from 'api/apiClient'
import { env } from 'utils'

export function getImageUrlFromStreamMetadata(resourceId: string): string | undefined {
    const imageServiceUrl = new URL(env.VITE_RIVER_STREAM_METADATA_URL)
    if (isSpaceStreamId(resourceId)) {
        const contractAddress = contractAddressFromSpaceId(resourceId)
        imageServiceUrl.pathname = `/space/${contractAddress}/image`
        return imageServiceUrl.toString()
    }
    if (isUserId(resourceId)) {
        imageServiceUrl.pathname = `/user/${resourceId}/image`
        return imageServiceUrl.toString()
    }
    return
}

export async function fetchSpaceImage(spaceId: string | undefined) {
    console.log('getSpaceImage', { spaceId })
    if (!spaceId || !isSpaceStreamId(spaceId)) {
        throw new Error('Invalid space id')
    }

    const imageServiceUrl = getImageUrlFromStreamMetadata(spaceId)

    if (!imageServiceUrl) {
        throw new Error('Invalid image service url')
    }

    console.log('getSpaceImage', { url: imageServiceUrl })

    const response = await axiosClient.get(imageServiceUrl, {
        responseType: 'blob',
    })

    if (response.status !== 200) {
        throw new Error('Network response was not ok')
    }

    const blob = response.data
    const mimeType = blob.type // Get the MIME type from the blob
    const imageObjectUrl = URL.createObjectURL(blob)

    return { imageObjectUrl, mimeType }
}

export async function fetchUserProfileImage(userId: string | undefined) {
    if (!userId) {
        throw new Error('Invalid user id')
    }
    const imageServiceUrl = getImageUrlFromStreamMetadata(userId)
    if (!imageServiceUrl) {
        throw new Error('Invalid image service url')
    }
    const response = await axiosClient.get(imageServiceUrl, {
        responseType: 'blob',
    })

    if (response.status !== 200) {
        throw new Error('Network response was not ok')
    }

    const blob = response.data
    const mimeType = blob.type // Get the MIME type from the blob
    const imageObjectUrl = URL.createObjectURL(blob)
    console.log('fetchUserProfileImage', imageObjectUrl)

    return { imageObjectUrl, mimeType }
}
