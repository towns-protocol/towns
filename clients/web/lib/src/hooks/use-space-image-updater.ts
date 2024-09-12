import { bin_toHexString, dlogger } from '@river-build/dlog'
import { Client as RiverClient } from '@river-build/sdk'
import { TownsClient } from 'client/TownsClient'
import { useCallback, useRef, useEffect } from 'react'
import { useImageStore } from '../store/use-image-store'

const dlog = dlogger('csb:hooks:space-image-updater')

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

export const useSpaceImageUpdater = (
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

    useEffect(() => {
        if (oldClient.current === client) {
            dlog.info('useSpaceImageUpdater, client changed', oldClient.current, client)
            oldClient.current = client
        }
        if (!client) {
            return
        }

        client.on('spaceImageUpdated', onSpaceImageUpdated)
        return () => {
            client.off('spaceImageUpdated', onSpaceImageUpdated)
        }
    }, [onSpaceImageUpdated, client, townsClient])
}
