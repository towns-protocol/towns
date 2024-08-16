import { contractAddressFromSpaceId, isSpaceStreamId } from '@river-build/sdk'

import { axiosClient } from 'api/apiClient'
import { env } from 'utils'

export function getImageServiceUrl(resourceId: string): string | undefined {
    if (!resourceId) {
        return undefined
    }

    if (isSpaceStreamId(resourceId)) {
        const imageServiceUrl = new URL(env.VITE_RIVER_STREAM_METADATA_URL)
        const contractAddress = contractAddressFromSpaceId(resourceId)
        imageServiceUrl.pathname = `/space/${contractAddress}/image`
        return imageServiceUrl.toString()
    }

    return undefined
}

export async function fetchSpaceImage(spaceId: string | undefined) {
    console.log('getSpaceImage', { spaceId })
    if (!spaceId || !isSpaceStreamId(spaceId)) {
        throw new Error('Invalid space id')
    }

    const imageServiceUrl = getImageServiceUrl(spaceId)

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
