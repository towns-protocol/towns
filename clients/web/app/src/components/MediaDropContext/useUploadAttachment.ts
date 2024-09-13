import {
    Attachment,
    ChunkedMediaAttachment,
    EncryptionResult,
    MediaInfo,
    encryptAESGCM,
    useImageStore,
    useTownsClient,
} from 'use-towns-client'
import { useCallback } from 'react'
import imageCompression from 'browser-image-compression'
import { ChunkedMedia } from '@river-build/proto'
import { bin_toHexString } from '@river-build/dlog'
import { buildImageUrl, refreshSpaceCache, refreshUserCache } from 'api/lib/fetchImage'
import { isImageMimeType } from 'utils/isMediaMimeType'

const CHUNK_SIZE = 500_000
const MAX_THUMBNAIL_WIDTH = 30 // pixels
const MAX_THUMBNAIL_SIZE = 0.003 // mb

export type EncryptionMetadataForUpload = {
    encryptionResult: EncryptionResult
    dataLength: number
    uri: URL
}

export const useUploadAttachment = () => {
    const {
        client,
        createMediaStream,
        setUserProfileImage,
        sendMediaPayload,
        getUserProfileImage,
    } = useTownsClient()
    const setLoadedResource = useImageStore((state) => state.setLoadedResource)

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
            const encryptionResult = await encryptAESGCM(data)
            const chunkCount = Math.ceil(encryptionResult.ciphertext.length / CHUNK_SIZE)
            const mediaStreamInfo = await createMediaStream(channelId, spaceId, userId, chunkCount)
            if (!mediaStreamInfo) {
                throw new Error('Failed to create media stream')
            }

            console.log('createChunkedAttachment', {
                spaceId: spaceId ?? 'undefined',
                channelId: channelId ?? 'undefined',
                userId: userId ?? 'undefined',
                mediaStreamInfo: mediaStreamInfo.streamId ?? 'undefined',
            })

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
            } satisfies ChunkedMediaAttachment
        },
        [createMediaStream, sendMediaPayload],
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
        ): Promise<boolean> => {
            if (!isImageMimeType(file.type)) {
                return false
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
                await client?.setSpaceImage(spaceId, chunkedMedia)
                console.log('setSpaceImage', {
                    spaceId,
                    mediaStreamId: mediaInfo.streamId,
                })

                await refreshSpaceCache(spaceId)
                // no issues uploading the image
                return true
            } catch (e) {
                console.error('Error uploading image to stream', e)
                return false
            } finally {
                // stop the spinner
                setProgress(0)
            }
        },
        [client, uploadImageFile],
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
                const imageUrl = await getUserProfileImage(userId).then((image) => {
                    if (!image || !image.info || !image.encryption?.value) {
                        return
                    }
                    return buildImageUrl(
                        image.streamId,
                        bin_toHexString(image.encryption.value.secretKey),
                        bin_toHexString(image.encryption.value.iv),
                    )
                })
                setLoadedResource(userId, { imageUrl })
                await refreshUserCache(userId)
                return true
            } catch (e) {
                console.error('Error uploading image to stream', e)
                return false
            } finally {
                setProgress(0)
            }
        },
        [getUserProfileImage, setLoadedResource, setUserProfileImage, uploadImageFile],
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
