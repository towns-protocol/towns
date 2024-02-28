import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Box, IconButton, MotionBox, Stack, Text } from '@ui'
import { FileUpload, useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { isMediaMimeType } from 'utils/isMediaMimeType'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

export const PasteFilePlugin = () => {
    const { files, removeFile, isUploadingFiles } = useMediaDropContext()

    // #TODO: add drag and drop functionality

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
                                sending={isUploadingFiles}
                                removeFile={removeFile}
                                waitingToSend={index !== 0 && isUploadingFiles}
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

const PastedFile = (props: PastedFileProps) => {
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
                    opacity={waitingToSend || sending ? '0.5' : 'opaque'}
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
            ) : (
                <IconButton
                    icon="close"
                    color="default"
                    position="topRight"
                    tooltip="Remove"
                    tooltipOptions={{ immediate: true }}
                    onClick={() => removeFile?.(id)}
                />
            )}
        </MotionBox>
    )
}
