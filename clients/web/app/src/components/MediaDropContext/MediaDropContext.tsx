import React, { createContext, useCallback, useContext, useState } from 'react'
import { toast } from 'react-hot-toast/headless'
import { uniqueId } from 'lodash'
import { isDefined } from '@river/sdk'
import { Attachment } from 'use-zion-client'
import { Box, Heading, Icon, Stack } from '@ui'
import { SpaceProtocol, useEnvironment } from 'hooks/useEnvironmnet'
import { useDevice } from 'hooks/useDevice'
import { FileUploadFailedToast } from '@components/RichText/FileUploadFailedToast'
import { isMediaMimeType } from 'utils/isMediaMimeType'
import { useUploadAttachment } from './useUploadAttachment'

type FileUploadFileContent = {
    kind: 'file'
    file: File
}

type FileUploadAttachmentContent = {
    kind: 'attachment'
    attachment: Attachment
}

export type FileUpload = {
    id: string
    content: FileUploadFileContent | FileUploadAttachmentContent
    progress: number
}

const MediaDropContext = createContext<{
    files: FileUpload[]
    channelId: string
    eventId?: string
    isUploadingFiles: boolean
    removeFile?: (id: string) => void
    uploadFiles?: () => Promise<Attachment[]>
    addFiles?: (files: File[]) => void
}>({
    files: [],
    channelId: '',
    isUploadingFiles: false,
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
    eventId?: string
    disableDrop?: boolean
}) => {
    const { channelId, disableDrop } = props
    const [isDragging, setIsDragging] = useState(false)

    const [isUploadingFiles, setIsUploadingFiles] = useState(false)
    const [files, setFiles] = useState<FileUpload[]>([])
    const { uploadAttachment } = useUploadAttachment()

    const { protocol } = useEnvironment()
    const { isTouch } = useDevice()

    const uploadFiles = useCallback(async () => {
        setIsUploadingFiles(true)
        const uploads = [...files]
        for (const file of uploads) {
            if (file.content.kind === 'attachment') {
                continue
            }
            const attachment = await uploadAttachment(channelId, file.content.file, (progress) => {
                const index = uploads.findIndex((f) => f.id === file.id)
                if (index > -1) {
                    uploads[index].progress = progress
                }
                setFiles([...uploads])
            })
            const index = uploads.findIndex((f) => f.id === file.id)
            if (index > -1) {
                uploads[index].content = {
                    kind: 'attachment',
                    attachment: attachment,
                }
                uploads[index].progress = 1
            }
            setFiles([...uploads])
        }
        setFiles([])
        setIsUploadingFiles(false)
        return uploads
            .map((f) => (f.content.kind === 'attachment' ? f.content.attachment : undefined))
            .filter(isDefined)
    }, [files, uploadAttachment, channelId, setFiles])

    const removeFile = useCallback(
        (id: string) => {
            setFiles(files.filter((file) => file.id !== id))
        },
        [files, setFiles],
    )

    const addFiles = useCallback(
        (addedFiles: File[]) => {
            const filteredFiles: FileUpload[] = files
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

    if (protocol !== SpaceProtocol.Casablanca) {
        return children
    }

    return (
        <MediaDropContext.Provider
            value={{
                files: files,
                addFiles: addFiles,
                channelId: props.channelId,
                eventId: props.eventId,
                removeFile: removeFile,
                uploadFiles: uploadFiles,
                isUploadingFiles: isUploadingFiles,
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
