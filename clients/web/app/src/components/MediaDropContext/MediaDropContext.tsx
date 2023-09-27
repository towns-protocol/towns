import React, { createContext, useCallback, useContext, useState } from 'react'
import { SpaceProtocol } from 'use-zion-client'
import { Box, Heading, Icon, Stack } from '@ui'
import { useEnvironment } from 'hooks/useEnvironmnet'

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

    const onDropImage = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()

        if (event.dataTransfer.files.length < 1) {
            return
        }
        setIsDragging(false)
        setFiles([...event.dataTransfer.files])
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
            <Box display="contents" onDragEnter={onDragEnter}>
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
