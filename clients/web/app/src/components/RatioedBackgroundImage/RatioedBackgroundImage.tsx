import React, { useRef } from 'react'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { Box, IconButton } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { useRestrictedImageDimensions } from 'ui/hooks/useRestrictedImageDimensions'
import { buttonStyle, containerStyle } from './RatioedBackgroundImage.css'

// shrinks image dimensions if too large for container

export const RatioedBackgroundImage = ({
    url,
    width,
    height,
    withLinkOut = false,
}: {
    url: string
    width?: number
    height?: number
    withLinkOut?: boolean
}) => {
    const MAX_WIDTH = 500
    const MAX_HEIGHT = 400
    const ref = useRef<HTMLDivElement>(null)

    const onClick = () => {
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const { width: calculatedWidth, height: calculatedHeight } = useRestrictedImageDimensions({
        maxWidth: MAX_WIDTH,
        maxHeight: MAX_HEIGHT,
        ref,
        imageWidth: width || 0,
        imageHeight: height || 0,
    })

    return (
        <Box maxWidth={`${MAX_WIDTH}`} maxHeight={`${MAX_HEIGHT}`} ref={ref}>
            <Box
                data-testid="ratioed-background-image"
                className={containerStyle}
                style={assignInlineVars({
                    width: `${calculatedWidth}px`,
                    height: `${calculatedHeight}px`,
                    // these are broken up instead of shorthand to avoid an issue with
                    // vanilla-extract in tests
                    backgroundImage: `url(${url})`,
                    backgroundColor: vars.color.background.level3,
                    backgroundPosition: 'center',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                })}
            >
                {withLinkOut && (
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
                )}
            </Box>
        </Box>
    )
}
