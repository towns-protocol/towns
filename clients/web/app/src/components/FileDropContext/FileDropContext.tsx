import React, { createContext, useCallback, useContext, useState } from 'react'
import { toast } from 'react-hot-toast/headless'
import { useDevice } from 'hooks/useDevice'
import { FileUploadFailedToast } from '@components/FileUploadFailedToast/FileUploadFailedToast'
import { Box, Heading, Icon, Stack } from '@ui'

const FileDropContext = createContext<{
    files: File[]
    clearFiles: () => void
    addFiles: (files: File[]) => void
    removeFile: (index: number) => void
}>({
    files: [],
    clearFiles: () => {},
    addFiles: () => {},
    removeFile: () => {},
})

export const useFileDropContext = () => {
    return useContext(FileDropContext)
}

/**
 * Simpler version of MediaDropContextProvider that only handles files.
 */
export const FileDropContextProvider = ({
    children,
    ...props
}: {
    title: string
    children: React.ReactNode
    disableDrop?: boolean
    maxFileSize?: number
}) => {
    const { disableDrop, maxFileSize = 25_000_000 } = props
    const [isDragging, setIsDragging] = useState(false)
    const [files, setFiles] = useState<File[]>([])

    const { isTouch } = useDevice()

    const clearFiles = useCallback(() => {
        setFiles([])
    }, [])

    const addFiles = useCallback(
        (addedFiles: File[]) => {
            const validatedFiles = files
            for (const file of addedFiles) {
                if (file.size > maxFileSize) {
                    const maxFileSizeInMb = maxFileSize / 1_000_000
                    toast.custom((t) => {
                        return (
                            <FileUploadFailedToast
                                toast={t}
                                message={`"File size exceeds maximum limit of ${maxFileSizeInMb}mb."`}
                            />
                        )
                    })
                } else {
                    validatedFiles.push(file)
                }
            }
            setFiles([...validatedFiles])
        },
        [files, maxFileSize],
    )

    const removeFile = useCallback(
        (index: number) => {
            setFiles(files.filter((_, i) => i !== index))
        },
        [files],
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
        <FileDropContext.Provider
            value={{
                files: files,
                addFiles: addFiles,
                clearFiles: clearFiles,
                removeFile: removeFile,
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
        </FileDropContext.Provider>
    )
}

const DropArea = (props: { title: string }) => {
    const { title } = props
    return (
        <Stack gap absoluteFill centerContent background="level1" pointerEvents="none">
            <Box padding="md" color="gray2" background="level2" rounded="sm">
                <Icon type="attachment" size="square_lg" />
            </Box>
            <Heading level={4}>{title}</Heading>
        </Stack>
    )
}
