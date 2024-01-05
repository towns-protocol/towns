import { Attachment, encryptAESGCM, useZionClient } from 'use-zion-client'
import { useCallback } from 'react'
import imageCompression from 'browser-image-compression'
import { isMediaMimeType } from 'utils/isMediaMimeType'

const CHUNK_SIZE = 500_000
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
            setProgress: (progress: number) => void,
        ): Promise<Attachment> => {
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
            setProgress(1)

            return {
                id: streamId,
                type: 'chunked_media',
                streamId,
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
            } satisfies Attachment
        },
        [createMediaStream, sendMediaPayload],
    )

    const uploadFile = useCallback(
        async (channelId: string, file: File, setProgress: (progress: number) => void) => {
            //
            const buffer = await file.arrayBuffer()
            const bytes = new Uint8Array(buffer)
            return await createChunkedAttachment(bytes, 0, 0, file, channelId, setProgress)
        },
        [createChunkedAttachment],
    )

    const uploadImageFile = useCallback(
        async (channelId: string, file: File, setProgress: (progress: number) => void) => {
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

            return await createChunkedAttachment(
                bytes,
                width,
                height,
                compressed,
                channelId,
                setProgress,
            )
        },
        [createChunkedAttachment],
    )

    const uploadAttachment = useCallback(
        async (channelId: string, file: File, setProgress: (progress: number) => void) => {
            if (isMediaMimeType(file.type)) {
                return await uploadImageFile(channelId, file, setProgress)
            } else {
                return await uploadFile(channelId, file, setProgress)
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
