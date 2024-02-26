import { Attachment, MediaInfo, encryptAESGCM, useZionClient } from 'use-zion-client'
import { useCallback } from 'react'
import imageCompression from 'browser-image-compression'
import { isMediaMimeType } from 'utils/isMediaMimeType'

const CHUNK_SIZE = 500_000
const MAX_THUMBNAIL_WIDTH = 30 // pixels
const MAX_THUMBNAIL_SIZE = 0.003 // mb

export const useUploadAttachment = () => {
    const { createMediaStream, sendMediaPayload } = useZionClient()
    function shouldCompressFile(file: File): boolean {
        return file.type !== 'image/gif' && isMediaMimeType(file.type)
    }

    const createChunkedAttachment = useCallback(
        async (
            data: Uint8Array,
            width: number,
            height: number,
            file: File,
            channelId: string,
            spaceId: string | undefined,
            thumbnail: File | undefined,
            setProgress: (progress: number) => void,
        ): Promise<Attachment> => {
            const encryptionResult = await encryptAESGCM(data)
            const chunkCount = Math.ceil(encryptionResult.ciphertext.length / CHUNK_SIZE)
            const mediaStreamInfo = await createMediaStream(channelId, spaceId, chunkCount)
            if (!mediaStreamInfo) {
                throw new Error('Failed to create media stream')
            }

            let chunkIndex = 0
            for (let i = 0; i < encryptionResult.ciphertext.length; i += CHUNK_SIZE) {
                const chunk = encryptionResult.ciphertext.slice(i, i + CHUNK_SIZE)
                setProgress(i / encryptionResult.ciphertext.length)
                const result = await sendMediaPayload(
                    mediaStreamInfo.streamId,
                    chunk,
                    chunkIndex++,
                    mediaStreamInfo.prevMiniblockHash,
                )
                if (!result) {
                    throw new Error('Failed to send media payload')
                }
                mediaStreamInfo.prevMiniblockHash = result.prevMiniblockHash
            }
            setProgress(1)

            let thumbnailInfo: { content: Uint8Array; info: MediaInfo } | undefined
            if (thumbnail) {
                thumbnailInfo = {
                    info: {
                        filename: thumbnail.name,
                        mimetype: thumbnail.type,
                        widthPixels: width,
                        heightPixels: height,
                        sizeBytes: BigInt(thumbnail.size),
                    },
                    content: new Uint8Array(await thumbnail.arrayBuffer()),
                }
            }

            return {
                id: mediaStreamInfo.streamId,
                type: 'chunked_media',
                streamId: mediaStreamInfo.streamId,
                encryption: {
                    iv: encryptionResult.iv,
                    secretKey: encryptionResult.secretKey,
                },
                info: {
                    filename: file.name,
                    mimetype: file.type,
                    widthPixels: width,
                    heightPixels: height,
                    sizeBytes: BigInt(data.length),
                },
                thumbnail: thumbnailInfo,
            } satisfies Attachment
        },
        [createMediaStream, sendMediaPayload],
    )

    const uploadFile = useCallback(
        async (
            channelId: string,
            spaceId: string | undefined,
            file: File,
            setProgress: (progress: number) => void,
        ) => {
            //
            const buffer = await file.arrayBuffer()
            const bytes = new Uint8Array(buffer)
            return await createChunkedAttachment(
                bytes,
                0,
                0,
                file,
                channelId,
                spaceId,
                undefined,
                setProgress,
            )
        },
        [createChunkedAttachment],
    )

    const uploadImageFile = useCallback(
        async (
            channelId: string,
            spaceId: string | undefined,
            file: File,
            setProgress: (progress: number) => void,
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

            const thumbnail = shouldCompressFile(file)
                ? await imageCompression(file, {
                      maxSizeMB: MAX_THUMBNAIL_SIZE,
                      maxWidthOrHeight: MAX_THUMBNAIL_WIDTH,
                  })
                : undefined

            const { width, height } = await imageSize(compressed)
            const buffer = await compressed.arrayBuffer()
            const bytes = new Uint8Array(buffer)

            return await createChunkedAttachment(
                bytes,
                width,
                height,
                compressed,
                channelId,
                spaceId,
                thumbnail,
                setProgress,
            )
        },
        [createChunkedAttachment],
    )

    const uploadAttachment = useCallback(
        async (
            channelId: string,
            spaceId: string | undefined,
            file: File,
            setProgress: (progress: number) => void,
        ) => {
            if (isMediaMimeType(file.type)) {
                return await uploadImageFile(channelId, spaceId, file, setProgress)
            } else {
                return await uploadFile(channelId, spaceId, file, setProgress)
            }
        },
        [uploadImageFile, uploadFile],
    )

    return { uploadAttachment }
}

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
