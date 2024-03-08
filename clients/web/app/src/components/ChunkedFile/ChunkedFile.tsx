import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useChunkedMedia } from 'use-towns-client'
import { useDownloadFile } from 'use-towns-client/dist/hooks/use-chunked-media'
import { Box, Button, Icon, IconButton, Stack, Text } from '@ui'
import { isMediaMimeType } from 'utils/isMediaMimeType'
import { useDevice } from 'hooks/useDevice'
import { useIsMessageAttachementContext } from '@components/MessageAttachments/useIsMessageAttachementContext'

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
    const { filename } = props
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

    if (isMediaMimeType(props.mimetype)) {
        return <ChunkedMedia {...props} onDownloadClicked={onDownloadClicked} />
    } else {
        return <ChunkedFileDownload {...props} onDownloadClicked={onDownloadClicked} />
    }
}

const ChunkedFileDownload = (
    props: Props & {
        onDownloadClicked: (event: React.MouseEvent<Element, MouseEvent>) => Promise<void>
    },
) => {
    const { filename, mimetype, onDownloadClicked } = props

    return (
        <Stack
            horizontal
            gap
            paddingX="md"
            paddingY="sm"
            border="level3"
            rounded="sm"
            pointerEvents="auto"
            cursor="pointer"
            alignItems="center"
            maxWidth="300"
            tooltip={filename}
            onClick={onDownloadClicked}
        >
            <Icon type="file" size="square_md" color="gray2" />
            <Stack gap="sm" overflow="hidden">
                <Text truncate fontWeight="medium" color="default" size="md">
                    {filename}
                </Text>
                {mimetype.length > 0 && (
                    <Text truncate color="gray2" size="sm">
                        {mimetype}
                    </Text>
                )}
            </Stack>
            <Button tone="level2" color="gray2" border="level3" size="button_sm" rounded="sm">
                <Icon type="download" color="gray2" size="square_sm" />
            </Button>
        </Stack>
    )
}

const ChunkedMedia = (
    props: Props & {
        onDownloadClicked: (event: React.MouseEvent<Element, MouseEvent>) => Promise<void>
    },
) => {
    const { width, height, thumbnail, onClick, onDownloadClicked } = props
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

    const [isHovering, setIsHovering] = useState(false)
    const onPointerEnter = useCallback(() => {
        setIsHovering(true)
    }, [])
    const onPointerLeave = useCallback(() => {
        setIsHovering(false)
    }, [])

    const { isMessageAttachementContext } = useIsMessageAttachementContext()

    const src = objectURL ?? thumbnailURL ?? ''
    const applyBlur = !objectURL

    const touchButton = isTouch && (
        <IconButton
            opaque
            icon="maximize"
            position="absolute"
            bottom="sm"
            right="sm"
            onClick={onClick}
        />
    )

    return isMessageAttachementContext ? (
        <Box
            width="100"
            height="100"
            rounded="sm"
            overflow="hidden"
            cursor="zoom-in"
            onClick={isTouch ? undefined : onClick}
        >
            <Box fit="full" as="img" src={src} objectFit="cover" />
            {touchButton}
        </Box>
    ) : (
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
            onPointerEnter={isTouch ? undefined : onPointerEnter}
            onPointerLeave={isTouch ? undefined : onPointerLeave}
        >
            <Box
                role="image"
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${src}`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    filter: applyBlur ? 'blur(10px) brightness(80%)' : undefined,
                }}
                onClick={isTouch ? undefined : onClick}
            />
            {isHovering && (
                <Box position="bottomRight" padding="sm">
                    <IconButton icon="download" onClick={onDownloadClicked} />
                </Box>
            )}
            {touchButton}
        </Box>
    )
}
