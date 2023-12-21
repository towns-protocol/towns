import React, { createContext, useCallback, useContext, useState } from 'react'
import { toast } from 'react-hot-toast/headless'
import { Box, Heading, Icon, Stack } from '@ui'
import { SpaceProtocol, useEnvironment } from 'hooks/useEnvironmnet'
import { useDevice } from 'hooks/useDevice'
import { FileUploadFailedToast } from '@components/RichText/FileUploadFailedToast'
import { isMediaMimeType } from 'utils/isMediaMimeType'

const MediaDropContext = createContext<{
    files: File[]
    addFiles?: (files: File[]) => void
    id: string
}>({
    files: [],
    id: '',
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
    id: string
    disableDrop?: boolean
}) => {
    const [isDragging, setIsDragging] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const { protocol } = useEnvironment()
    const disableDrop = props.disableDrop || false
    const { isTouch } = useDevice()

    const onDropImage = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setIsDragging(false)
        if (event.dataTransfer.files.length < 1) {
            return
        }
        const filteredFiles: File[] = []
        for (const file of event.dataTransfer.files) {
            // Images are compressed, so we don't need to check their filesize here
            // with the exception of gifs, which are not compressed before upload
            if (file.type !== 'image/gif' && isMediaMimeType(file.type)) {
                filteredFiles.push(file)
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
                filteredFiles.push(file)
            }
        }
        setFiles(filteredFiles)
    }, [])

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
        <MediaDropContext.Provider value={{ files: files, addFiles: setFiles, id: props.id }}>
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
