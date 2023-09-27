import React, { useEffect, useState } from 'react'
import { useChunkedMedia } from 'use-zion-client'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'

type Props = {
    streamId: string
    mimetype: string
    width: number
    height: number
    iv: Uint8Array
    secretKey: Uint8Array
    thumbnail?: Uint8Array
}

export const ChunkedMedia = (props: Props) => {
    const { width, height, thumbnail } = props
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
        <RatioedBackgroundImage
            url={objectURL ?? thumbnailURL ?? ''}
            width={width}
            height={height}
        />
    )
}
