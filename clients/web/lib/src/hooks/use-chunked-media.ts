import { useCallback, useEffect, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { decryptAESGCM } from '../utils/crypto-utils'
import { Client } from '@river/sdk'

type Props = {
    streamId: string
    iv: Uint8Array
    secretKey: Uint8Array
}
async function getObjectURL(
    streamId: string,
    casablancaClient: Client,
    iv: Uint8Array,
    secretKey: Uint8Array,
    useCache: boolean,
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
    const data = mediaInfo.chunks.reduce((acc, chunk) => {
        return new Uint8Array([...acc, ...chunk])
    }, new Uint8Array())

    const decrypted = await decryptAESGCM(data, iv, secretKey)

    const blob = new Blob([decrypted])
    const objectURL = URL.createObjectURL(blob)
    if (useCache) {
        await cache.put(cacheKey, new Response(blob))
    }
    return objectURL
}

export function useChunkedMedia(props: Props) {
    const { streamId } = props
    const { casablancaClient } = useZionContext()
    const [objectURL, setObjectURL] = useState<string | undefined>(undefined)

    useEffect(() => {
        if (!casablancaClient) {
            return
        }

        const download = getObjectURL(streamId, casablancaClient, props.iv, props.secretKey, true)
        download
            .then((objectURL) => {
                setObjectURL(objectURL)
            })
            .catch((err) => {
                console.log(err)
            })
    }, [casablancaClient, setObjectURL, streamId, props.iv, props.secretKey])

    return { objectURL }
}

export function useDownloadFile(props: Props) {
    const { streamId } = props
    const { casablancaClient } = useZionContext()

    const downloadFile = useCallback(async () => {
        if (!casablancaClient) {
            return
        }
        return getObjectURL(streamId, casablancaClient, props.iv, props.secretKey, false)
    }, [casablancaClient, streamId, props.iv, props.secretKey])

    return { downloadFile }
}
