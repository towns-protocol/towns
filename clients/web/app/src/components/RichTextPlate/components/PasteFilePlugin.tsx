import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Box, IconButton, MotionBox, Stack, Text } from '@ui'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { isMediaMimeType } from 'utils/isMediaMimeType'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { FileUpload } from '@components/MediaDropContext/mediaDropTypes'

export const PasteFilePlugin = ({
    editableContainerRef,
}: {
    editableContainerRef: React.RefObject<HTMLDivElement>
}) => {
    const { files, addFiles, removeFile } = useMediaDropContext()

    useEffect(() => {
        if (!editableContainerRef.current || !addFiles) {
            return
        }

        // Make a local copy of the ref object to use during unmount, otherwise the ref object may be null
        const _editableRef = editableContainerRef.current
        const onPasteEvent = async (e: ClipboardEvent) => {
            if (!e.clipboardData || !addFiles) {
                return
            }
            const files = Array.from(e.clipboardData.files)
            if (files.length > 0) {
                addFiles(files)
            }
        }

        _editableRef.addEventListener('paste', onPasteEvent)
        return () => {
            _editableRef.removeEventListener('paste', onPasteEvent)
        }
    }, [editableContainerRef, addFiles])

    if (files.length === 0) {
        return <></>
    }

    return (
        <Box overflowX="scroll">
            <Stack horizontal gap>
                <AnimatePresence>
                    {files.map((imageFile, index) => {
                        return (
                            <PastedFile
                                key={imageFile.id}
                                {...imageFile}
                                waitingToSend
                                sending={false}
                                removeFile={removeFile}
                            />
                        )
                    })}
                </AnimatePresence>
            </Stack>
        </Box>
    )
}

type PastedFileProps = FileUpload & {
    sending: boolean
    waitingToSend: boolean
    removeFile?: (id: string) => void
}

export const PastedFile = (props: PastedFileProps) => {
    const { id, content, removeFile, sending, waitingToSend } = props

    const info = useMemo(() => {
        if (content.kind === 'file') {
            return {
                mimetype: content.file.type,
                filename: content.file.name,
            }
        } else if (content.kind === 'attachment') {
            if (
                content.attachment.type === 'chunked_media' ||
                content.attachment.type === 'embedded_media'
            ) {
                return {
                    mimetype: content.attachment.info.mimetype,
                    filename: content.attachment.info.filename,
                }
            }
        }
        return {
            mimetype: '',
            filename: '',
        }
    }, [content])

    const showImagePreview = isMediaMimeType(info.mimetype)
    const [objectURL, setObjectURL] = useState<string | undefined>(undefined)

    useEffect(() => {
        ;(async () => {
            if (showImagePreview && content.kind === 'file') {
                const objectURL = URL.createObjectURL(new Blob([await content.file.arrayBuffer()]))
                setObjectURL(objectURL)
            }
        })()
    }, [content, setObjectURL, showImagePreview])

    return (
        <MotionBox
            key={id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            position="relative"
        >
            {showImagePreview ? (
                <MotionBox
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
                    animate={{
                        opacity: props.progress < 1 || waitingToSend ? 0.5 : 1,
                    }}
                />
            ) : (
                <Box padding paddingRight="lg" border="level3" rounded="sm">
                    <Text size="sm" fontWeight="medium">
                        {info.filename}
                    </Text>
                </Box>
            )}

            {sending ? (
                <Box position="absoluteCenter" overflow="hidden">
                    <ButtonSpinner />
                </Box>
            ) : waitingToSend ? (
                <IconButton
                    icon="close"
                    color="default"
                    position="topRight"
                    tooltip="Remove"
                    tooltipOptions={{ immediate: true }}
                    onClick={() => removeFile?.(id)}
                />
            ) : (
                <></>
            )}
        </MotionBox>
    )
}
