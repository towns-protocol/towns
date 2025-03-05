import { chunkSize, encryptAESGCM, encryptChunkedAESGCM, useTownsClient } from 'use-towns-client'
import { useCallback } from 'react'
import imageCompression from 'browser-image-compression'
import { ChunkedMedia, CreationCookie } from '@river-build/proto'
import { Attachment, ChunkedMediaAttachment, MediaInfo, streamIdAsString } from '@river-build/sdk'
import { refreshSpaceCache, refreshUserImageCache } from 'api/lib/fetchImage'
import { isImageMimeType } from 'utils/isMediaMimeType'

const MAX_THUMBNAIL_WIDTH = 20 // pixels
const MAX_THUMBNAIL_SIZE = 0.0003 // 300 bytes

export const useUploadAttachment = () => {
    const { createMediaStreamNew, setUserProfileImage, sendMediaPayloadNew, setSpaceImage } =
        useTownsClient()

    function shouldCompressFile(file: File): boolean {
        return file.type !== 'image/gif' && isImageMimeType(file.type)
    }

    const createChunkedAttachment = useCallback(
        async (
            data: Uint8Array,
            width: number,
            height: number,
            file: File,
            channelId: string | undefined,
            spaceId: string | undefined,
            userId: string | undefined,
            thumbnail: File | undefined,
            setProgress: (progress: number) => void,
        ): Promise<Attachment> => {
            const encryptionResult = window.townsNewMediaEncryptionFlag
                ? await encryptChunkedAESGCM(data, chunkSize)
                : await encryptAESGCM(data, chunkSize)
            const chunkCount = encryptionResult.chunks.length
            const mediaStreamInfo = await createMediaStreamNew(
                channelId,
                spaceId,
                userId,
                chunkCount,
                window.townsNewMediaEncryptionFlag,
            )
            if (!mediaStreamInfo) {
                throw new Error('Failed to create media stream')
            }

            console.log('createChunkedAttachment', {
                spaceId: spaceId ?? 'undefined',
                channelId: channelId ?? 'undefined',
                userId: userId ?? 'undefined',
                creationCookie: mediaStreamInfo.creationCookie ?? 'undefined',
                perChunkEncryption: window.townsNewMediaEncryptionFlag ?? 'undefined',
            })

            let cc: CreationCookie = new CreationCookie(mediaStreamInfo.creationCookie)
            for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
                const chunk = encryptionResult.chunks[chunkIndex]
                setProgress(chunkIndex / chunkCount)
                const result = await sendMediaPayloadNew(
                    cc,
                    chunkIndex == chunkCount - 1,
                    chunk.ciphertext,
                    chunkIndex,
                    window.townsNewMediaEncryptionFlag ? chunk.iv : undefined,
                )
                if (!result) {
                    throw new Error('Failed to send media payload')
                }
                cc = new CreationCookie(result.creationCookie)
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
                id: streamIdAsString(mediaStreamInfo.creationCookie.streamId),
                type: 'chunked_media',
                streamId: streamIdAsString(mediaStreamInfo.creationCookie.streamId),
                encryption: {
                    iv: window.townsNewMediaEncryptionFlag
                        ? new Uint8Array(0)
                        : (encryptionResult.chunks[0].iv as Uint8Array),
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
            } satisfies ChunkedMediaAttachment
        },
        [createMediaStreamNew, sendMediaPayloadNew],
    )

    const uploadFile = useCallback(
        async (
            channelId: string | undefined,
            spaceId: string | undefined,
            file: File,
            setProgress: (progress: number) => void,
        ) => {
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
                undefined,
                setProgress,
            )
        },
        [createChunkedAttachment],
    )

    const uploadImageFile = useCallback(
        async (
            channelId: string | undefined,
            spaceId: string | undefined,
            userId: string | undefined,
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
                userId,
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
            setError: () => void,
        ) => {
            try {
                if (isImageMimeType(file.type)) {
                    return await uploadImageFile(channelId, spaceId, undefined, file, setProgress)
                } else {
                    return await uploadFile(channelId, spaceId, file, setProgress)
                }
            } catch (e) {
                setError()
            }
        },
        [uploadImageFile, uploadFile],
    )

    const uploadTownImageToStream = useCallback(
        async (
            spaceId: string,
            file: File,
            setProgress: (progress: number) => void,
        ): Promise<{ ok: boolean; invalidationId?: string }> => {
            if (!isImageMimeType(file.type)) {
                return { ok: false }
            }
            console.log('uploadTownImageToStream', { spaceId })

            // set progress to 1 to start the spinner
            setProgress(1)

            try {
                const mediaInfo = (await uploadImageFile(
                    undefined,
                    spaceId,
                    undefined,
                    file,
                    () => {}, // disabled. Control the spinner in uploadTownImageToStream()
                )) as ChunkedMediaAttachment

                // add a spaceImage event to the stream
                // will be encrypted by client.setSpaceImage()
                // no need for encryption here
                const chunkedMedia = new ChunkedMedia({
                    info: mediaInfo.info,
                    streamId: mediaInfo.streamId,
                    encryption: {
                        case: 'aesgcm',
                        value: {
                            iv: mediaInfo.encryption.iv,
                            secretKey: mediaInfo.encryption.secretKey,
                        },
                    },
                })
                const result = await setSpaceImage(spaceId, chunkedMedia)
                console.log('setSpaceImage', {
                    spaceId,
                    mediaStreamId: mediaInfo.streamId,
                    result,
                })

                const { invalidationId } = await refreshSpaceCache(spaceId)
                // no issues uploading the image
                return { ok: true, invalidationId }
            } catch (e) {
                console.error('Error uploading image to stream', e)
                return { ok: false }
            } finally {
                // stop the spinner
                setProgress(0)
            }
        },
        [setSpaceImage, uploadImageFile],
    )

    const uploadUserProfileImageToStream = useCallback(
        async (
            userId: string,
            file: File,
            setProgress: (progress: number) => void,
        ): Promise<boolean> => {
            if (!isImageMimeType(file.type)) {
                return false
            }

            setProgress(1)
            try {
                const mediaInfo = (await uploadImageFile(
                    undefined,
                    undefined,
                    userId,
                    file,
                    () => {}, // disabled. We're controlling the spinner in uploadUserProfileImageToStream
                )) as ChunkedMediaAttachment

                // Will be encrypted by client.setUserProfileImage()
                const chunkedMedia = new ChunkedMedia({
                    info: mediaInfo.info,
                    streamId: mediaInfo.streamId,
                    encryption: {
                        case: 'aesgcm',
                        value: {
                            iv: mediaInfo.encryption.iv,
                            secretKey: mediaInfo.encryption.secretKey,
                        },
                    },
                })
                await setUserProfileImage(chunkedMedia)
                await refreshUserImageCache(userId)
                return true
            } catch (e) {
                console.error('Error uploading image to stream', e)
                return false
            } finally {
                setProgress(0)
            }
        },
        [setUserProfileImage, uploadImageFile],
    )

    return { uploadAttachment, uploadTownImageToStream, uploadUserProfileImageToStream }
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
