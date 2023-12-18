import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { DRAG_DROP_PASTE } from '@lexical/rich-text'
import { COMMAND_PRIORITY_LOW } from 'lexical'
import { uniqueId } from 'lodash'
import { useChannelId, useSpaceId } from 'use-zion-client'
import { useEvent } from 'react-use-event-hook'
import { AnimatePresence } from 'framer-motion'
import { Box, IconButton, MotionBox, Stack, Text } from '@ui'
import { useSendFileMessage } from 'hooks/useSendFileMessage'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { isMediaMimeType } from 'utils/isMediaMimeType'

type Props = {
    threadId?: string
    isSendingFiles: boolean
    setIsSendingFiles: (sending: boolean) => void
    setFileCount: (count: number) => void
    showErrorMessage: (message: string) => void
}

export const PasteFilePlugin = (props: Props) => {
    const mediaDropContext = useMediaDropContext()
    const {
        isSendingFiles: isSendingImages,
        setFileCount: setImageCount,
        showErrorMessage,
        threadId,
    } = props
    const [imageFiles, setImageFiles] = useState<PastedFile[]>([])
    const [editor] = useLexicalComposerContext()

    useEffect(() => {
        setImageCount(imageFiles.length)
    }, [imageFiles, setImageCount])

    const addFiles = useEvent((files: File[]) => {
        const MAX_IMAGE_COUNT = 4
        // Don't allow more than 4 images at the same time (arbitrary limit)
        // and don't allow pasting/dropping while sending images, since it creates a
        // strange UX pattern where pasted images would be added to the queue and
        // sent automatically

        const prev = imageFiles
        for (const file of files) {
            if (prev.length > MAX_IMAGE_COUNT) {
                break
            }
            const id = uniqueId()
            const pastedImage: PastedFile = { id, file: file }
            prev.push(pastedImage)
        }
        setImageFiles([...prev])
    })

    useEffect(() => {
        return editor.registerCommand(
            DRAG_DROP_PASTE,
            (files) => {
                addFiles(files)
                return false
            },
            COMMAND_PRIORITY_LOW,
        )
    }, [addFiles, editor])

    useEffect(() => {
        if (mediaDropContext.files.length > 0) {
            addFiles(mediaDropContext.files)
        }
    }, [mediaDropContext.files, addFiles])

    const removeImageFile = useCallback(
        (id: string) => {
            setImageFiles((prev) => prev.filter((imageFile) => imageFile.id !== id))
        },
        [setImageFiles],
    )
    if (imageFiles.length === 0) {
        return <></>
    }

    return (
        <Box overflowX="scroll">
            <Stack horizontal gap>
                <AnimatePresence>
                    {imageFiles.map((imageFile, index) => {
                        return (
                            <PastedFile
                                key={imageFile.id}
                                {...imageFile}
                                threadId={threadId}
                                shouldSend={index === 0 && isSendingImages}
                                removeFile={removeImageFile}
                                waitingToSend={index !== 0 && isSendingImages}
                                showErrorMessage={showErrorMessage}
                            />
                        )
                    })}
                </AnimatePresence>
            </Stack>
        </Box>
    )
}

type PastedFile = {
    id: string
    file: File
}

type PastedFileProps = PastedFile & {
    threadId?: string
    shouldSend: boolean
    waitingToSend: boolean
    removeFile: (id: string) => void
    showErrorMessage: (message: string) => void
}

const PastedFile = (props: PastedFileProps) => {
    const spaceId = useSpaceId()
    const channelId = useChannelId()
    const { sendImageMessage } = useSendFileMessage()
    const [progress, setProgress] = useState(0)

    const { id, file, removeFile, shouldSend, waitingToSend, threadId, showErrorMessage } = props

    const showImagePreview = isMediaMimeType(file.type)
    const [objectURL, setObjectURL] = useState<string | undefined>(undefined)
    const uploadInProgress = useRef(false)

    useEffect(() => {
        async function sendImage() {
            if (!shouldSend || uploadInProgress.current) {
                return
            }

            uploadInProgress.current = true

            try {
                await sendImageMessage(channelId, file, setProgress, threadId)
                removeFile(id)
            } catch (err) {
                console.error(err)
                showErrorMessage('Oops! We had trouble uploading your image.')
            } finally {
                uploadInProgress.current = false
            }
        }

        if (shouldSend && !uploadInProgress.current) {
            sendImage()
        }
    }, [
        shouldSend,
        uploadInProgress,
        channelId,
        id,
        spaceId,
        file,
        removeFile,
        sendImageMessage,
        setProgress,
        threadId,
        showErrorMessage,
    ])

    useEffect(() => {
        ;(async () => {
            if (!file) {
                setObjectURL(undefined)
                return
            }

            const objectURL = URL.createObjectURL(new Blob([await file.arrayBuffer()]))
            setObjectURL(objectURL)
        })()
    }, [file, setObjectURL])

    return (
        <MotionBox
            key={id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            position="relative"
            layout="position"
        >
            {showImagePreview ? (
                <Box
                    role="img"
                    width="100"
                    height="100"
                    background="level3"
                    style={{
                        backgroundImage: `url(${objectURL})`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                        backgroundRepeat: 'no-repeat',
                    }}
                    rounded="sm"
                    opacity={waitingToSend || shouldSend ? '0.5' : 'opaque'}
                />
            ) : (
                <Box padding paddingRight="lg" border="level3" rounded="sm">
                    <Text size="sm" fontWeight="medium">
                        {file.name}
                    </Text>
                </Box>
            )}

            {!shouldSend && (
                <IconButton
                    icon="close"
                    color="default"
                    position="topRight"
                    tooltip="Remove"
                    tooltipOptions={{ immediate: true }}
                    onClick={() => removeFile(id)}
                />
            )}

            <Box
                border={shouldSend ? 'textDefault' : 'none'}
                height="x1"
                position="bottomLeft"
                rounded="xs"
                overflow="hidden"
                bottom="xs"
                left="xs"
                right="xs"
            >
                <MotionBox
                    position="absolute"
                    height="100%"
                    width="100%"
                    background="inverted"
                    initial={{
                        scaleX: 0,
                        originX: 0,
                    }}
                    animate={{
                        scaleX: progress,
                    }}
                    transition={{ duration: 0.1 }}
                />
            </Box>
        </MotionBox>
    )
}
