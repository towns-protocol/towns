import React, { useMemo } from 'react'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'

type Props = {
    content: Uint8Array
    mimetype: string
    width: number
    height: number
}

export const EmbeddedMedia = (props: Props) => {
    const { content, width, height } = props
    const objectURL = useMemo(() => {
        const url = URL.createObjectURL(new Blob([content]))
        return url
    }, [content])
    return <RatioedBackgroundImage url={objectURL} width={width} height={height} />
}
