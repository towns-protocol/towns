import { useCallback, useEffect, useState } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'
import { decryptAESGCM } from '../utils/crypto-utils'
import { Client, streamIdAsBytes, unpackMiniblock } from '@river-build/sdk'
import { MediaPayload } from '@river-build/proto'

export const chunkSize = 500_000

type Props = {
    streamId: string
    iv: Uint8Array
    secretKey: Uint8Array
    mimetype?: string
}

async function getObjectData(
    streamId: string,
    casablancaClient: Client,
    iv: Uint8Array,
    secretKey: Uint8Array,
): Promise<Uint8Array | undefined> {
    if (!casablancaClient) {
        return undefined
    }

    const response = casablancaClient.rpcClient.getStreamEx({
        streamId: streamIdAsBytes(streamId),
    })

    // Retrieve the first (genesis) miniblock
    const firstChunk = await response[Symbol.asyncIterator]().next()
    if (firstChunk.done) {
        throw new Error(`Stream ${streamId} ended before receiving genesis miniblock.`)
    }

    if (firstChunk.value.data.case !== 'miniblock') {
        throw new Error(`Expected genesis miniblock but received ${firstChunk.value.data.case}`)
    }

    const mb = await unpackMiniblock(
        firstChunk.value.data.value,
        casablancaClient.opts?.unpackEnvelopeOpts,
    )

    const payload: MediaPayload = mb.events[0].event.payload.value as MediaPayload
    if (payload.content.case !== 'inception') {
        throw new Error(`Expected inception payload but received ${payload.content.case}`)
    }

    const chunkCount = payload.content.value.chunkCount
    const perChunkEncryption = payload.content.value.perChunkEncryption

    // Preallocate buffer if chunk sizes are known
    const buffer = new Uint8Array(chunkCount * chunkSize)
    let offset = 0
    let seenEndOfStream = false

    // Process remaining chunks
    for await (const chunk of response) {
        if (seenEndOfStream) {
            throw new Error(`GetStreamEx: received data after end of stream for ${streamId}.`)
        }

        if (chunk.data.case === 'miniblock') {
            const mb = await unpackMiniblock(
                chunk.data.value,
                casablancaClient.opts?.unpackEnvelopeOpts,
            )

            for (const event of mb.events) {
                const payload: MediaPayload = event.event.payload.value as MediaPayload
                if (payload.content.case !== 'chunk') {
                    continue
                }

                let data = payload.content.value.data
                if (perChunkEncryption) {
                    data = await decryptAESGCM({
                        ciphertext: payload.content.value.data,
                        iv: payload.content.value.iv as Uint8Array,
                        secretKey,
                    })
                }

                buffer.set(data, offset)
                offset += data.length
            }
        } else if (chunk.data.case === 'minipool') {
            // TODO: Handle minipool case
        } else if (chunk.data.case === undefined) {
            seenEndOfStream = true
        }
    }

    if (perChunkEncryption) {
        return buffer.slice(0, offset)
    }

    return await decryptAESGCM({
        ciphertext: buffer.slice(0, offset),
        secretKey,
        iv,
    })
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

    const data = await getObjectData(streamId, casablancaClient, iv, secretKey)
    if (!data) {
        return undefined
    }

    const blob = new Blob([data], mimetype ? { type: mimetype } : undefined)
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
