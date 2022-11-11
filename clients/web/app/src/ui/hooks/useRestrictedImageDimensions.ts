import { useMemo } from 'react'
import { useSize } from './useSize'

export function getRestrictedImageDimensions({
    maxWidth,
    maxHeight,
    imageWidth,
    imageHeight,
}: {
    maxWidth: number
    maxHeight: number
    imageWidth: number
    imageHeight: number
}) {
    let newWidth = imageWidth
    let newHeight = imageHeight
    const ratio = imageWidth / imageHeight
    const containerRatio = maxWidth / maxHeight

    if (ratio > containerRatio) {
        // too wide, contain width and set new height
        newWidth = imageWidth > maxWidth ? maxWidth : imageWidth
        newHeight = newWidth / ratio
    } else {
        // too tall, contain height and set new width
        newHeight = imageHeight > maxHeight ? maxHeight : imageHeight
        newWidth = newHeight * ratio
    }

    return {
        width: newWidth,
        height: newHeight,
    }
}

export function useRestrictedImageDimensions({
    maxHeight,
    maxWidth,
    imageHeight,
    imageWidth,
    ref,
}: {
    maxWidth: number
    maxHeight: number
    imageWidth: number
    imageHeight: number
    ref: React.RefObject<HTMLDivElement>
}) {
    const DEFAULT_WIDTH = 500
    const { width: refWidth } = useSize(ref) ?? {}

    const { width, height } = useMemo(() => {
        const containerWidth = refWidth ?? DEFAULT_WIDTH
        return getRestrictedImageDimensions({
            maxWidth: containerWidth > maxWidth ? containerWidth : maxWidth,
            maxHeight: maxHeight,
            imageWidth: imageWidth || 0,
            imageHeight: imageHeight || 0,
        })
    }, [refWidth, maxWidth, maxHeight, imageWidth, imageHeight])
    return { width, height }
}
