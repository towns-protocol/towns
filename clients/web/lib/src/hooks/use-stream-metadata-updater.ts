import { bin_toHexString, dlogger } from '@river-build/dlog'
import { Client as RiverClient, getUserIdFromStreamId } from '@river-build/sdk'
import { TownsClient } from 'client/TownsClient'
import { useCallback, useRef, useEffect } from 'react'
import { useImageStore } from '../store/use-image-store'

const dlog = dlogger('csb:hooks:stream-metadata-updater')

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
    const oldClient = useRef(client)
    const { setLoadedResource } = useImageStore()

    const onSpaceImageUpdated = useCallback(
        (spaceId: string) => {
            if (!client || !streamMetadataUrl) {
                return
            }
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
                    setLoadedResource(spaceId, { imageUrl })
                })
        },
        [client, setLoadedResource, streamMetadataUrl],
    )

    const onMyUserProfileImageUpdated = useCallback(
        (streamId: string) => {
            if (!client || !streamMetadataUrl) {
                return
            }
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
                    setLoadedResource(userId, { imageUrl })
                })
        },
        [client, setLoadedResource, streamMetadataUrl],
    )

    useEffect(() => {
        if (oldClient.current === client) {
            dlog.info('useStreamMetadataUpdater, client changed', oldClient.current, client)
            oldClient.current = client
        }
        if (!client) {
            return
        }

        client.on('spaceImageUpdated', onSpaceImageUpdated)
        client.on('userProfileImageUpdated', onMyUserProfileImageUpdated)
        return () => {
            client.off('spaceImageUpdated', onSpaceImageUpdated)
            client.off('userProfileImageUpdated', onMyUserProfileImageUpdated)
        }
    }, [onSpaceImageUpdated, client, townsClient, onMyUserProfileImageUpdated])
}
