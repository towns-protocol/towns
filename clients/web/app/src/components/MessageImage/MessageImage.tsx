import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MessageContent } from 'use-zion-client'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { Box, IconButton } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { useSize } from 'ui/hooks/useSize'
import { buttonStyle, containerStyle } from './MessageImage.css'

// shrinks image dimensions if too large for container
function getRestrictedImageDimensions({
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

const DEFAULT_WIDTH = 500

export const MessageImage = ({ content }: { content: MessageContent }) => {
    const MAX_WIDTH = 500
    const MAX_HEIGHT = 400
    const url = content?.info?.thumbnail_url
    const thumbnailInfo = content?.info?.thumbnail_info
    const ref = useRef<HTMLDivElement>(null)

    const { width: containerWidth } = useSize(ref) ?? {}

    const onClick = () => {
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const { width, height } = useMemo(() => {
        return getRestrictedImageDimensions({
            maxWidth:
                (containerWidth ?? DEFAULT_WIDTH) > MAX_WIDTH
                    ? containerWidth ?? DEFAULT_WIDTH
                    : MAX_WIDTH,
            maxHeight: MAX_HEIGHT,
            imageWidth: thumbnailInfo.w,
            imageHeight: thumbnailInfo.h,
        })
    }, [containerWidth, thumbnailInfo.h, thumbnailInfo.w])

    return (
        <Box maxWidth={`${MAX_WIDTH}`} maxHeight={`${MAX_HEIGHT}`} ref={ref}>
            <Box
                className={containerStyle}
                style={assignInlineVars({
                    width: `${width}px`,
                    height: `${height}px`,
                    background: `center/contain ${vars.color.background.level3} url(${url}) no-repeat`,
                })}
            >
                <IconButton
                    opaque
                    icon="linkOut"
                    className={buttonStyle}
                    size="square_xs"
                    position="absolute"
                    top="sm"
                    right="sm"
                    onClick={onClick}
                />
            </Box>
        </Box>
    )
}
