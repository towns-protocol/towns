import React, { useEffect, useState } from 'react'
import { useChunkedMedia } from 'use-zion-client'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { Box } from '@ui'

type Props = {
    streamId: string
    mimetype: string
    width: number
    height: number
    iv: Uint8Array
    secretKey: Uint8Array
    thumbnail?: Uint8Array
    onClick: (event: React.MouseEvent<HTMLElement>) => void
}

export const ChunkedMedia = (props: Props) => {
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
