import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useChunkedMedia } from 'use-zion-client'
import { useDownloadFile } from 'use-zion-client/dist/hooks/use-chunked-media'
import { Box, Button, Icon, IconButton, Stack, Text } from '@ui'
import { isMediaMimeType } from 'utils/isMediaMimeType'
import { useDevice } from 'hooks/useDevice'

type Props = {
    streamId: string
    mimetype: string
    width: number
    height: number
    filename: string
    iv: Uint8Array
    secretKey: Uint8Array
    thumbnail?: Uint8Array
    onClick: (event: React.MouseEvent<HTMLElement>) => void
}

export const ChunkedFile = (props: Props) => {
    if (isMediaMimeType(props.mimetype)) {
        return <ChunkedMedia {...props} />
    } else {
        return <ChunkedFileDownload {...props} />
    }
}

const ChunkedFileDownload = (props: Props) => {
    const { filename, mimetype } = props
    const { downloadFile } = useDownloadFile(props)
    const onDownloadClicked = useCallback(
        async (event: React.MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            const objectURL = await downloadFile()
            if (!objectURL) {
                return
            }

            // based on https://pqina.nl/blog/how-to-prompt-the-user-to-download-a-file-instead-of-navigating-to-it/
            const link = document.createElement('a')
            link.style.display = 'none'
            link.href = objectURL
            link.download = filename

            document.body.appendChild(link)
            link.click()
            setTimeout(() => {
                URL.revokeObjectURL(link.href)
                link.parentNode?.removeChild(link)
            }, 0)
        },
        [downloadFile, filename],
    )

    return (
        <Stack horizontal>
            <Stack
                horizontal
                gap
                paddingX="md"
                paddingY="sm"
                width="auto"
                border="level3"
                rounded="sm"
                pointerEvents="auto"
                cursor="pointer"
                alignItems="center"
                onClick={onDownloadClicked}
            >
                <Icon type="file" size="square_md" color="gray2" />
                <Stack gap="sm">
                    <Text fontWeight="medium" color="default" size="md">
                        {filename}
                    </Text>
                    {mimetype.length > 0 && (
                        <Text color="gray2" size="sm">
                            {mimetype}
                        </Text>
                    )}
                </Stack>
                <Button tone="level2" color="gray2" border="level3" size="button_sm" rounded="sm">
                    <Icon type="download" color="gray2" size="square_sm" />
                </Button>
            </Stack>
        </Stack>
    )
}

const ChunkedMedia = (props: Props) => {
    const { width, height, thumbnail, onClick } = props
    const [thumbnailURL, setThumbnailURL] = useState<string | undefined>(undefined)
    const { objectURL } = useChunkedMedia(props)
    const { isTouch } = useDevice()

    const multiplier = isTouch ? 0.7 : 1
    const MAX_HEIGHT = 280 * multiplier

    const calculatedHeight = useMemo(() => {
        const imageRatio = width / height
        if (imageRatio > 3) {
            return MAX_HEIGHT / imageRatio
        } else {
            return MAX_HEIGHT
        }
    }, [width, height, MAX_HEIGHT])

    useEffect(() => {
        if (thumbnail) {
            const blob = new Blob([thumbnail])
            const url = URL.createObjectURL(blob)
            setThumbnailURL(url)
        }
    }, [thumbnail])

    return (
        <Box
            position="relative"
            cursor="zoom-in"
            style={{
                height: calculatedHeight,
                maxWidth: '75%',
                aspectRatio: `${width} / ${height}`,
            }}
            rounded="sm"
            overflow="hidden"
        >
            <Box
                role="image"
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${objectURL ?? thumbnailURL ?? ''}`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                }}
                onClick={isTouch ? undefined : onClick}
            />
            {isTouch && (
                <IconButton
                    opaque
                    icon="maximize"
                    position="absolute"
                    bottom="sm"
                    right="sm"
                    onClick={onClick}
                />
            )}
        </Box>
    )
}
