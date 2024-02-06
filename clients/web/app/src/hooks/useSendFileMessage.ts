import { useCallback, useState } from 'react'
import {
    MessageType,
    SendChunkedMediaMessageOptions,
    encryptAESGCM,
    useZionClient,
} from 'use-zion-client'
import imageCompression from 'browser-image-compression'
import { isMediaMimeType } from 'utils/isMediaMimeType'

/* 
The encryption limit is 65536*3/4 = 49152 chars (encryptionDevice.ts)
40k will sometimes overshoot when the protobuf is serialized, while 35k seems ok!
*/
const MAX_EMBEDDED_SIZE = 35 * 1024
const CHUNK_SIZE = 500_000

export const useSendFileMessage = () => {
    const { sendMessage, createMediaStream, sendMediaPayload } = useZionClient()
    const [sendingMessage, setSendingMessage] = useState<boolean>(false)

    function shouldCompressFile(file: File): boolean {
        return file.type !== 'image/gif' && isMediaMimeType(file.type)
    }

    const sendEmbeddedImage = useCallback(
        async (
            data: Uint8Array,
            width: number,
            height: number,
            mimetype: string,
            channelId: string,
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
            channelId: string,
            setProgress: (progress: number) => void,
            file: File,
            threadId?: string,
        ) => {
            setSendingMessage(true)
            const encryptionResult = await encryptAESGCM(data)
            const chunkCount = Math.ceil(encryptionResult.ciphertext.length / CHUNK_SIZE)

            const streamId = await createMediaStream(channelId, chunkCount)
            if (!streamId) {
                throw new Error('Failed to create media stream')
            }

            let chunkIndex = 0
            for (let i = 0; i < encryptionResult.ciphertext.length; i += CHUNK_SIZE) {
                const chunk = encryptionResult.ciphertext.slice(i, i + CHUNK_SIZE)
                setProgress(i / encryptionResult.ciphertext.length)
                await sendMediaPayload(streamId, chunk, chunkIndex++)
            }

            let thumbnailInfo: SendChunkedMediaMessageOptions['thumbnail']
            if (isMediaMimeType(file.type)) {
                // 0.025MB / 128px is an arbitrary limit for the thumbnail — it's way below the encryption limit
                const thumbnail = await imageCompression(file, {
                    maxSizeMB: 0.025,
                    maxWidthOrHeight: 128,
                })
                const { width: thumbnailWidth, height: thumbnailHeight } = await imageSize(
                    thumbnail,
                )
                const thumbnailBuffer = await thumbnail.arrayBuffer()
                const thumbnailBytes = new Uint8Array(thumbnailBuffer)

                thumbnailInfo = {
                    info: {
                        mimetype: mimetype,
                        widthPixels: thumbnailWidth,
                        heightPixels: thumbnailHeight,
                        sizeBytes: BigInt(thumbnailBytes.length),
                    },

                    content: thumbnailBytes,
                }
            } else {
                thumbnailInfo = {
                    info: {
                        mimetype: mimetype,
                        widthPixels: 0,
                        heightPixels: 0,
                        sizeBytes: BigInt(0),
                    },
                    content: new Uint8Array(0),
                }
            }
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
                    filename: file.name,
                },
                thumbnail: thumbnailInfo,
                threadId: threadId,
            })
            setProgress(0)
            setSendingMessage(false)
        },
        [sendMessage, createMediaStream, sendMediaPayload],
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

    const uploadImageFile = useCallback(
        async (
            channelId: string,
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

    const uploadFile = useCallback(
        async (
            channelId: string,
            file: File,
            setProgress: (progress: number) => void,
            threadId?: string,
        ) => {
            //
            const buffer = await file.arrayBuffer()
            const bytes = new Uint8Array(buffer)
            await sendChunkedImage(bytes, 0, 0, file.type, channelId, setProgress, file, threadId)
        },
        [sendChunkedImage],
    )

    const sendImageMessage = useCallback(
        async (
            channelId: string,
            file: File,
            setProgress: (progress: number) => void,
            threadId?: string,
        ) => {
            if (isMediaMimeType(file.type)) {
                await uploadImageFile(channelId, file, setProgress, threadId)
            } else {
                await uploadFile(channelId, file, setProgress, threadId)
            }
        },
        [uploadImageFile, uploadFile],
    )

    return { sendImageMessage, sendingMessage }
}
