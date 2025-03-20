import { contractAddressFromSpaceId, isSpaceStreamId, isUserId } from '@towns-protocol/sdk'

import { axiosClient } from 'api/apiClient'
import { env } from 'utils'

export function getImageUrlFromStreamMetadata(resourceId: string) {
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
}

export async function fetchSpaceImage(spaceId: string | undefined) {
    if (!spaceId || !isSpaceStreamId(spaceId)) {
        throw new Error('Invalid space id')
    }
    const imageServiceUrl = getImageUrlFromStreamMetadata(spaceId)
    if (!imageServiceUrl) {
        throw new Error('Invalid image service url')
    }

    const response = await fetch(imageServiceUrl)
    if (response.status !== 200) {
        throw new Error('Network response was not ok')
    }

    return { imageUrl: response.url }
}

export async function fetchUserProfileImage(userId: string | undefined) {
    if (!userId) {
        throw new Error('Invalid user id')
    }
    const imageServiceUrl = getImageUrlFromStreamMetadata(userId)
    if (!imageServiceUrl) {
        throw new Error('Invalid image service url')
    }

    const response = await fetch(imageServiceUrl)
    if (response.status !== 200) {
        throw new Error('Network response was not ok')
    }

    return { imageUrl: response.url }
}

type RefreshCacheResponse = { ok: boolean; invalidationId?: string }

export async function refreshSpaceCache(spaceId: string): Promise<RefreshCacheResponse> {
    const route = new URL(env.VITE_RIVER_STREAM_METADATA_URL)
    const contractAddress = contractAddressFromSpaceId(spaceId)
    route.pathname = `/space/${contractAddress}/refresh`
    try {
        const { data } = await axiosClient.get<RefreshCacheResponse>(route.toString())
        return { ok: data.ok, invalidationId: data.invalidationId }
    } catch (e) {
        return { ok: false }
    }
}

export async function refreshUserImageCache(userId: string): Promise<RefreshCacheResponse> {
    const route = new URL(env.VITE_RIVER_STREAM_METADATA_URL)
    route.pathname = `/user/${userId}/refresh`
    route.searchParams.set('target', 'image')
    try {
        const { data } = await axiosClient.get<RefreshCacheResponse>(route.toString())
        return { ok: data.ok, invalidationId: data.invalidationId }
    } catch (e) {
        return { ok: false }
    }
}

export async function refreshUserBioCache(userId: string): Promise<RefreshCacheResponse> {
    const route = new URL(env.VITE_RIVER_STREAM_METADATA_URL)
    route.pathname = `/user/${userId}/refresh`
    route.searchParams.set('target', 'bio')
    try {
        const { data } = await axiosClient.get<RefreshCacheResponse>(route.toString())
        return { ok: data.ok, invalidationId: data.invalidationId }
    } catch (e) {
        return { ok: false }
    }
}

type RefreshStatusResponse = { status: 'completed' | 'pending' | 'unset' | 'error' }

export async function getRefreshStatus(invalidationId: string) {
    const route = new URL(env.VITE_RIVER_STREAM_METADATA_URL)
    route.pathname = `/refreshStatus/${invalidationId}`
    const { data } = await axiosClient.get<RefreshStatusResponse>(route.toString())
    return data
}

export const buildSpaceMetadataUrl = (spaceAddress: string) => {
    const url = new URL(env.VITE_RIVER_STREAM_METADATA_URL)
    url.pathname = `/space/${spaceAddress}`
    return url.toString()
}
