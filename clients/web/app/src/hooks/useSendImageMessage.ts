import { useCallback, useState } from 'react'
import {
    MessageType,
    RoomIdentifier,
    encryptAESGCM,
    useSpaceId,
    useZionClient,
} from 'use-zion-client'
import imageCompression from 'browser-image-compression'

/* 
The encryption limit is 65536*3/4 = 49152 chars (olmDevice.ts)
40k will sometimes overshoot when the protobuf is serialized, while 35k seems ok!
*/
const MAX_EMBEDDED_SIZE = 35 * 1024
const CHUNK_SIZE = 500_000

export const useSendImageMessage = () => {
    const { sendMessage, createMediaStream, sendMediaPayload } = useZionClient()
    const spaceId = useSpaceId()
    const [sendingMessage, setSendingMessage] = useState<boolean>(false)

    function shouldCompressFile(file: File): boolean {
        return file.type !== 'image/gif'
    }

    const sendEmbeddedImage = useCallback(
        async (
            data: Uint8Array,
            width: number,
            height: number,
            mimetype: string,
            channelId: RoomIdentifier,
            threadId?: string,
        ) => {
            await sendMessage(channelId, '', {
                messageType: MessageType.EmbeddedMedia,
                content: data,
                info: {
                    mimetype: mimetype,
                    widthPixels: width,
                    heightPixels: height,
                    sizeBytes: BigInt(data.length),
                },
                threadId: threadId,
            })
        },
        [sendMessage],
    )

    const sendChunkedImage = useCallback(
        async (
            data: Uint8Array,
            width: number,
            height: number,
            mimetype: string,
            channelId: RoomIdentifier,
            setProgress: (progress: number) => void,
            file: File,
            threadId?: string,
        ) => {
            setSendingMessage(true)
            const encryptionResult = await encryptAESGCM(data)
            const chunkCount = Math.ceil(encryptionResult.ciphertext.length / CHUNK_SIZE)

            const streamId = await createMediaStream(
                spaceId?.networkId ?? '',
                channelId.networkId,
                chunkCount,
            )
            if (!streamId) {
                throw new Error('Failed to create media stream')
            }

            let chunkIndex = 0
            for (let i = 0; i < encryptionResult.ciphertext.length; i += CHUNK_SIZE) {
                const chunk = encryptionResult.ciphertext.slice(i, i + CHUNK_SIZE)
                setProgress(i / encryptionResult.ciphertext.length)
                await sendMediaPayload(streamId, chunk, chunkIndex++)
            }

            // 0.025MB / 128px is an arbitrary limit for the thumbnail — it's way below the encryption limit
            const thumbnail = await imageCompression(file, {
                maxSizeMB: 0.025,
                maxWidthOrHeight: 128,
            })
            const { width: thumbnailWidth, height: thumbnailHeight } = await imageSize(thumbnail)
            const thumbnailBuffer = await thumbnail.arrayBuffer()
            const thumbnailBytes = new Uint8Array(thumbnailBuffer)

            setProgress(1)

            await sendMessage(channelId, '', {
                messageType: MessageType.ChunkedMedia,
                streamId,
                iv: encryptionResult.iv,
                secretKey: encryptionResult.secretKey,
                info: {
                    mimetype: mimetype,
                    widthPixels: width,
                    heightPixels: height,
                    sizeBytes: BigInt(encryptionResult.ciphertext.length),
                },
                thumbnail: {
                    info: {
                        mimetype: mimetype,
                        widthPixels: thumbnailWidth,
                        heightPixels: thumbnailHeight,
                        sizeBytes: BigInt(thumbnailBytes.length),
                    },
                    content: thumbnailBytes,
                },
                threadId: threadId,
            })
            setProgress(0)
            setSendingMessage(false)
        },
        [sendMessage, createMediaStream, sendMediaPayload, spaceId?.networkId],
    )

    async function imageSize(file: File): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const image = new Image()
            image.onload = () => {
                resolve({ width: image.width, height: image.height })
            }
            image.onerror = reject
            image.src = URL.createObjectURL(file)
        })
    }

    const sendImageMessage = useCallback(
        async (
            channelId: RoomIdentifier,
            file: File,
            setProgress: (progress: number) => void,
            threadId?: string,
        ) => {
            /** Do some basic compression to avoid ridiculous file sizes
             * unless the image is animated
             */
            const compressed = shouldCompressFile(file)
                ? await imageCompression(file, {
                      maxSizeMB: 1,
                      maxWidthOrHeight: 2048,
                  })
                : file
            const { width, height } = await imageSize(compressed)
            const buffer = await compressed.arrayBuffer()
            const bytes = new Uint8Array(buffer)

            if (compressed.size < MAX_EMBEDDED_SIZE) {
                await sendEmbeddedImage(bytes, width, height, compressed.type, channelId, threadId)
            } else {
                await sendChunkedImage(
                    bytes,
                    width,
                    height,
                    compressed.type,
                    channelId,
                    setProgress,
                    file,
                    threadId,
                )
            }
        },
        [sendEmbeddedImage, sendChunkedImage],
    )

    return { sendImageMessage, sendingMessage }
}
