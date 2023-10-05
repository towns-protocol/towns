import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { DRAG_DROP_PASTE } from '@lexical/rich-text'
import { COMMAND_PRIORITY_LOW } from 'lexical'
import { uniqueId } from 'lodash'
import { useChannelId, useSpaceId } from 'use-zion-client'
import { useEvent } from 'react-use-event-hook'
import { AnimatePresence } from 'framer-motion'
import { Box, IconButton, MotionBox, Stack } from '@ui'
import { useSendImageMessage } from 'hooks/useSendImageMessage'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { filterAllowedMediaFiles } from 'utils/filterAllowedMediaFiles'

type Props = {
    threadId?: string
    isSendingImages: boolean
    setIsSendingImages: (sending: boolean) => void
    setImageCount: (count: number) => void
    imageUploadFailed: () => void
}

export const PasteImagePlugin = (props: Props) => {
    const mediaDropContext = useMediaDropContext()
    const { isSendingImages, setImageCount, imageUploadFailed, threadId } = props
    const [imageFiles, setImageFiles] = useState<PastedImage[]>([])
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
        const filteredFiles = filterAllowedMediaFiles(files)
        for (const file of filteredFiles) {
            if (prev.length > MAX_IMAGE_COUNT) {
                break
            }
            const id = uniqueId()
            const pastedImage: PastedImage = { id, imageFile: file }
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
                            <PastedImage
                                key={imageFile.id}
                                {...imageFile}
                                threadId={threadId}
                                shouldSend={index === 0 && isSendingImages}
                                removeImageFile={removeImageFile}
                                waitingToSend={index !== 0 && isSendingImages}
                                imageUploadFailed={imageUploadFailed}
                            />
                        )
                    })}
                </AnimatePresence>
            </Stack>
        </Box>
    )
}

type PastedImage = {
    id: string
    imageFile: File
}

type PastedImageProps = PastedImage & {
    threadId?: string
    shouldSend: boolean
    waitingToSend: boolean
    removeImageFile: (id: string) => void
    imageUploadFailed: () => void
}

const PastedImage = (props: PastedImageProps) => {
    const spaceId = useSpaceId()
    const channelId = useChannelId()
    const { sendImageMessage } = useSendImageMessage()
    const [progress, setProgress] = useState(0)
    const [didFail, setDidFail] = useState(false)

    const {
        id,
        imageFile,
        removeImageFile,
        shouldSend,
        waitingToSend,
        threadId,
        imageUploadFailed,
    } = props
    const [objectURL, setObjectURL] = useState<string | undefined>(undefined)
    const uploadInProgress = useRef(false)

    useEffect(() => {
        async function sendImage() {
            if (!spaceId || !shouldSend || uploadInProgress.current) {
                return
            }

            uploadInProgress.current = true
            setDidFail(false)

            try {
                await sendImageMessage(channelId, imageFile, setProgress, threadId)
                removeImageFile(id)
            } catch (err) {
                console.error(err)
                setDidFail(true)
                imageUploadFailed()
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
        imageFile,
        removeImageFile,
        sendImageMessage,
        setProgress,
        threadId,
        imageUploadFailed,
    ])

    useEffect(() => {
        ;(async () => {
            if (!imageFile) {
                setObjectURL(undefined)
                return
            }

            const objectURL = URL.createObjectURL(new Blob([await imageFile.arrayBuffer()]))
            setObjectURL(objectURL)
        })()
    }, [imageFile, setObjectURL])

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

            {(!shouldSend || didFail) && (
                <IconButton
                    icon="close"
                    color="default"
                    position="topRight"
                    tooltip="Remove"
                    tooltipOptions={{ immediate: true }}
                    onClick={() => removeImageFile(id)}
                />
            )}

            {didFail && (
                <Box
                    position="absolute"
                    background="inverted"
                    padding="xs"
                    rounded="xs"
                    textAlign="center"
                    fontSize="xs"
                    bottom="xs"
                    left="xs"
                    right="xs"
                >
                    Try again
                </Box>
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
