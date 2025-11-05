import {
    ChunkedMediaSchema,
    CreationCookieSchema,
    type ChunkedMedia,
    type EmbeddedMedia,
    type PlainMessage,
} from '@towns-protocol/proto'
import {
    addressFromUserId,
    makeEvent,
    make_MediaPayload_Inception,
    make_MediaPayload_Chunk,
    makeUniqueMediaStreamId,
    streamIdAsBytes,
    streamIdAsString,
} from '../..'
import type { ClientV2 } from '../index'
import { create } from '@bufbuild/protobuf'
import { encryptChunkedAESGCM } from '@towns-protocol/sdk-crypto'

const CHUNK_SIZE = 1200000 // 1.2MB max per chunk (including auth tag)

type SendChunkedMediaParams =
    | {
          type: 'chunked'
          data: Blob
          width?: number
          height?: number
          filename: string
          thumbnail?: PlainMessage<EmbeddedMedia>
      }
    | {
          type: 'chunked'
          data: Uint8Array
          width?: number
          height?: number
          filename: string
          mimetype: string
          thumbnail?: PlainMessage<EmbeddedMedia>
      }

/**
 * Encrypt and send a chunked media to the media stream
 * @param client - Towns Client
 * @param params - The parameters to send the chunked media. Optionally include a thumbnail.
 * @returns
 */
const sendChunkedMedia = async (
    client: ClientV2,
    params: SendChunkedMediaParams,
    opts: {
        detectMimeType?: (data: Uint8Array) => Promise<string> | string
        detectDimensions?: (
            data: Uint8Array,
            mimetype: string,
        ) => Promise<{ width: number; height: number }> | { width: number; height: number }
    } = {},
): Promise<ChunkedMedia> => {
    const { filename, thumbnail } = params
    let width = params.width ?? 0
    let height = params.height ?? 0
    let data: Uint8Array
    let mimetype: string

    if (params.data instanceof Blob) {
        const buffer = await params.data.arrayBuffer()
        data = new Uint8Array(buffer)
        mimetype = params.data.type
    } else {
        data = params.data
        if ('mimetype' in params) {
            mimetype = params.mimetype
        } else if (opts.detectMimeType) {
            mimetype = await opts.detectMimeType(data)
        } else {
            throw new Error('mimetype is required for Uint8Array data')
        }
    }
    if (opts.detectDimensions && (!width || !height)) {
        const dimensions = await opts.detectDimensions(data, mimetype)
        width = dimensions.width
        height = dimensions.height
    }

    const { chunks, secretKey } = await encryptChunkedAESGCM(data, CHUNK_SIZE)
    const chunkCount = chunks.length

    if (chunkCount === 0) {
        throw new Error('No media chunks generated')
    }

    const mediaStreamId = makeUniqueMediaStreamId()
    const events = await Promise.all([
        makeEvent(
            client.signerContext,
            make_MediaPayload_Inception({
                streamId: streamIdAsBytes(mediaStreamId),
                userId: addressFromUserId(client.userId),
                chunkCount,
                perChunkEncryption: true,
            }),
        ),
        makeEvent(
            client.signerContext,
            make_MediaPayload_Chunk({
                data: chunks[0].ciphertext,
                chunkIndex: 0,
                iv: chunks[0].iv,
            }),
        ),
    ])
    const mediaStreamResponse = await client.rpc.createMediaStream({
        events,
        streamId: streamIdAsBytes(mediaStreamId),
    })

    if (!mediaStreamResponse?.nextCreationCookie) {
        throw new Error('Failed to create media stream')
    }

    if (chunkCount > 1) {
        let cc = create(CreationCookieSchema, mediaStreamResponse.nextCreationCookie)
        for (let chunkIndex = 1; chunkIndex < chunkCount; chunkIndex++) {
            const chunkEvent = await makeEvent(
                client.signerContext,
                make_MediaPayload_Chunk({
                    data: chunks[chunkIndex].ciphertext,
                    chunkIndex: chunkIndex,
                    iv: chunks[chunkIndex].iv,
                }),
                cc.prevMiniblockHash,
            )
            const result = await client.rpc.addMediaEvent({
                event: chunkEvent,
                creationCookie: cc,
                last: chunkIndex === chunkCount - 1,
            })

            if (!result?.creationCookie) {
                throw new Error('Failed to send media chunk')
            }

            cc = create(CreationCookieSchema, result.creationCookie)
        }
    }
    return create(ChunkedMediaSchema, {
        info: {
            filename,
            mimetype,
            widthPixels: width,
            heightPixels: height,
            sizeBytes: BigInt(data.length),
        },
        streamId: streamIdAsString(mediaStreamId),
        encryption: {
            case: 'aesgcm',
            value: {
                iv: new Uint8Array(0),
                secretKey: secretKey,
            },
        },
        thumbnail,
    })
}

export { CHUNK_SIZE, sendChunkedMedia, type SendChunkedMediaParams }
