import { bin_toHexString } from '@towns-protocol/dlog'
import { Client as RiverClient, getUserIdFromStreamId } from '@towns-protocol/sdk'
import { TownsClient } from 'client/TownsClient'
import { useEffect } from 'react'
import { useImageStore } from '../store/use-image-store'

const buildImageUrl = (
    mediaStreamId: string,
    key: string,
    iv: string,
    streamMetadataUrl: string,
) => {
    const url = new URL(streamMetadataUrl)
    url.pathname = `/media/${mediaStreamId}`
    url.searchParams.set('key', key)
    url.searchParams.set('iv', iv)
    return url.toString()
}

export const useStreamMetadataUpdater = (
    client?: RiverClient,
    townsClient?: TownsClient,
    streamMetadataUrl?: string,
) => {
    useEffect(() => {
        if (!client || !streamMetadataUrl) {
            return
        }

        const onSpaceImageUpdated = (spaceId: string) => {
            console.log('onSpaceImageUpdated', spaceId)
            void client
                .stream(spaceId)
                ?.view.spaceContent.getSpaceImage()
                .then((image) => {
                    if (!image || !image.info || !image.encryption?.value) {
                        return
                    }
                    const imageUrl = buildImageUrl(
                        image.streamId,
                        bin_toHexString(image.encryption.value.secretKey),
                        bin_toHexString(image.encryption.value.iv),
                        streamMetadataUrl,
                    )
                    useImageStore.getState().setLoadedResource(spaceId, { imageUrl })
                })
        }

        const onMyUserProfileImageUpdated = (streamId: string) => {
            console.log('onMyUserProfileImageUpdated', streamId)
            const userId = getUserIdFromStreamId(streamId)
            void client
                .stream(streamId)
                ?.view.userMetadataContent.getProfileImage()
                .then((image) => {
                    if (!image || !image.info || !image.encryption?.value) {
                        return
                    }
                    const imageUrl = buildImageUrl(
                        image.streamId,
                        bin_toHexString(image.encryption.value.secretKey),
                        bin_toHexString(image.encryption.value.iv),
                        streamMetadataUrl,
                    )
                    useImageStore.getState().setLoadedResource(userId, { imageUrl })
                })
        }

        client.on('spaceImageUpdated', onSpaceImageUpdated)
        client.on('userProfileImageUpdated', onMyUserProfileImageUpdated)
        return () => {
            client.off('spaceImageUpdated', onSpaceImageUpdated)
            client.off('userProfileImageUpdated', onMyUserProfileImageUpdated)
        }
    }, [client, townsClient, streamMetadataUrl])
}
