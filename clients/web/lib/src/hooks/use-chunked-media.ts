import { useCallback, useEffect, useState } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'
import { decryptAESGCM } from '../utils/crypto-utils'
import { Client } from '@river-build/sdk'

type Props = {
    streamId: string
    iv: Uint8Array
    secretKey: Uint8Array
    mimetype?: string
}

async function getObjectURL(
    streamId: string,
    casablancaClient: Client,
    iv: Uint8Array,
    secretKey: Uint8Array,
    useCache: boolean,
    mimetype?: string,
): Promise<string | undefined> {
    const cache = await caches.open('chunked-media')
    const cacheKey = `/media-stream/${streamId}`
    const response = await cache.match(cacheKey)
    if (response) {
        const blob = await response.blob()
        return URL.createObjectURL(blob)
    }

    if (!casablancaClient) {
        return undefined
    }

    const stream = await casablancaClient.getStream(streamId)
    const mediaInfo = stream.mediaContent.info
    if (!mediaInfo) {
        return undefined
    }
    const data = new Uint8Array(
        mediaInfo.chunks.reduce((totalLength, chunk) => totalLength + chunk.length, 0),
    )
    let offset = 0
    mediaInfo.chunks.forEach((chunk) => {
        data.set(chunk, offset)
        offset += chunk.length
    })

    const decrypted = await decryptAESGCM(data, iv, secretKey)

    const blob = new Blob([decrypted], mimetype ? { type: mimetype } : undefined)
    const objectURL = URL.createObjectURL(blob)
    if (useCache) {
        await cache.put(cacheKey, new Response(blob))
    }
    return objectURL
}

export function useChunkedMedia(props: Props) {
    const { streamId } = props
    const { casablancaClient } = useTownsContext()
    const [objectURL, setObjectURL] = useState<string | undefined>(undefined)

    useEffect(() => {
        if (!casablancaClient) {
            return
        }

        const download = getObjectURL(
            streamId,
            casablancaClient,
            props.iv,
            props.secretKey,
            true,
            props.mimetype,
        )
        download
            .then((objectURL) => {
                setObjectURL(objectURL)
            })
            .catch((err) => {
                console.log(err)
            })
    }, [casablancaClient, setObjectURL, streamId, props.iv, props.secretKey, props.mimetype])

    return { objectURL }
}

export function useDownloadFile(props: Props) {
    const { streamId } = props
    const { casablancaClient } = useTownsContext()

    const downloadFile = useCallback(async () => {
        if (!casablancaClient) {
            return
        }
        return getObjectURL(
            streamId,
            casablancaClient,
            props.iv,
            props.secretKey,
            false,
            props.mimetype,
        )
    }, [casablancaClient, streamId, props.iv, props.secretKey, props.mimetype])

    return { downloadFile }
}
