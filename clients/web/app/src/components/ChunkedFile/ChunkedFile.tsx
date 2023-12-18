import React, { useCallback, useEffect, useState } from 'react'
import { useChunkedMedia } from 'use-zion-client'
import { useDownloadFile } from 'use-zion-client/dist/hooks/use-chunked-media'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { Box, Button, Stack, Text } from '@ui'
import { isMediaMimeType } from 'utils/isMediaMimeType'

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
                width="auto"
                padding="sm"
                border="level3"
                rounded="xs"
                pointerEvents="auto"
                cursor="pointer"
                alignItems="center"
                gap="lg"
            >
                <Stack gap="sm" onClick={onDownloadClicked}>
                    <Text fontWeight="strong" color="default" size="sm">
                        {filename}
                    </Text>
                    <Text color="gray2" size="xs">
                        {mimetype}
                    </Text>
                </Stack>
                <Button tone="level3" size="button_sm" onClick={onDownloadClicked}>
                    Download
                </Button>
            </Stack>
        </Stack>
    )
}

const ChunkedMedia = (props: Props) => {
    const { width, height, thumbnail, onClick } = props
    const [thumbnailURL, setThumbnailURL] = useState<string | undefined>(undefined)
    const { objectURL } = useChunkedMedia(props)

    useEffect(() => {
        if (thumbnail) {
            const blob = new Blob([thumbnail])
            const url = URL.createObjectURL(blob)
            setThumbnailURL(url)
        }
    }, [thumbnail])

    return (
        <Box cursor="zoom-in">
            <RatioedBackgroundImage
                url={objectURL ?? thumbnailURL ?? ''}
                width={width}
                height={height}
                onClick={onClick}
            />
        </Box>
    )
}
