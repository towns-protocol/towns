import { uniqueId } from 'lodash'
import React, { createContext, useCallback, useContext, useState } from 'react'
import { toast } from 'react-hot-toast/headless'
import { useDevice } from 'hooks/useDevice'
import { FileUploadFailedToast } from '@components/FileUploadFailedToast/FileUploadFailedToast'
import { Box, Heading, Icon, Stack } from '@ui'
import { isMediaMimeType } from 'utils/isMediaMimeType'
import { FileUpload, FileUploadFileContent } from './mediaDropTypes'
import { useUploadToMessage } from './useUploadToMessage'

const MediaDropContext = createContext<{
    files: FileUpload[]
    channelId: string
    eventId?: string
    clearFiles?: () => void
    removeFile?: (id: string) => void
    uploadFiles?: (messageId: string) => Promise<void>
    addFiles?: (files: File[]) => void
}>({
    files: [],
    channelId: '',
})

export const useMediaDropContext = () => {
    return useContext(MediaDropContext)
}

export const MediaDropContextProvider = ({
    children,
    ...props
}: {
    children: React.ReactNode
    title: string
    channelId: string
    spaceId: string | undefined
    eventId?: string
    disableDrop?: boolean
}) => {
    const { channelId, spaceId, disableDrop } = props
    const [isDragging, setIsDragging] = useState(false)

    const { isTouch } = useDevice()

    // files ready to upload
    const [files, setFiles] = useState<FileUpload<FileUploadFileContent>[]>([])

    const { uploadToMessage } = useUploadToMessage()

    const uploadFiles = useCallback(
        (messageId: string) => {
            if (!channelId) {
                throw new Error('missing spaceId or channelId')
            }
            const result = uploadToMessage({ files, spaceId, channelId, messageId })
            setFiles([])
            return result
        },
        [channelId, files, spaceId, uploadToMessage],
    )

    const removeFile = useCallback(
        (id: string) => {
            setFiles(files.filter((file) => file.id !== id))
        },
        [files, setFiles],
    )

    const clearFiles = useCallback(() => {
        setFiles([])
    }, [])

    const addFiles = useCallback(
        (addedFiles: File[]) => {
            const filteredFiles: FileUpload<FileUploadFileContent>[] = files
            const MAX_IMAGE_COUNT = 8
            for (const file of addedFiles) {
                if (filteredFiles.length >= MAX_IMAGE_COUNT) {
                    break
                }
                // Images are compressed, so we don't need to check their filesize here
                // with the exception of gifs, which are not compressed before upload
                if (file.type !== 'image/gif' && isMediaMimeType(file.type)) {
                    filteredFiles.push({
                        content: { kind: 'file', file: file },
                        id: uniqueId(),
                        progress: 0,
                    })
                    continue
                }

                if (file.size > 5_000_000) {
                    toast.custom((t) => {
                        return (
                            <FileUploadFailedToast
                                toast={t}
                                message="File size exceeds maximum limit of 5mb."
                            />
                        )
                    })
                } else {
                    filteredFiles.push({
                        content: { kind: 'file', file: file },
                        id: uniqueId(),
                        progress: 0,
                    })
                }
            }
            setFiles([...filteredFiles])
        },
        [files, setFiles],
    )

    const onDropImage = useCallback(
        async (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            event.stopPropagation()
            setIsDragging(false)
            if (event.dataTransfer.files.length < 1) {
                return
            }
            addFiles(Array.from(event.dataTransfer.files))
        },
        [addFiles],
    )

    const onDragEnter = useCallback((e: React.DragEvent<HTMLElement>) => {
        setIsDragging(true)
    }, [])

    const onDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const onDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    return (
        <MediaDropContext.Provider
            value={{
                files: files,
                addFiles: addFiles,
                channelId: props.channelId,
                eventId: props.eventId,
                clearFiles: clearFiles,
                removeFile: removeFile,
                uploadFiles: uploadFiles,
            }}
        >
            <Box display="contents" onDragEnter={isTouch ? undefined : onDragEnter}>
                {children}
                {isDragging && !disableDrop && (
                    <Box
                        absoluteFill
                        pointerEvents="all"
                        zIndex="tooltips"
                        onDragOver={onDragOver}
                        onDrop={onDropImage}
                        onDragLeave={onDragLeave}
                    >
                        <DropArea title={props.title} />
                    </Box>
                )}
            </Box>
        </MediaDropContext.Provider>
    )
}

const DropArea = (props: { title: string }) => {
    const { title } = props
    return (
        <Stack gap absoluteFill centerContent background="level1" pointerEvents="none">
            <Box padding="md" color="gray2" background="level2" rounded="sm">
                <Icon type="camera" size="square_lg" />
            </Box>
            <Heading level={4}>{title}</Heading>
        </Stack>
    )
}
