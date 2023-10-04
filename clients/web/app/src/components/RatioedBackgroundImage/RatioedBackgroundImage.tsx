import React, { useRef } from 'react'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { Box, IconButton } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { useRestrictedImageDimensions } from 'ui/hooks/useRestrictedImageDimensions'
import { useDevice } from 'hooks/useDevice'
import { containerStyle } from './RatioedBackgroundImage.css'

// shrinks image dimensions if too large for container

export const RatioedBackgroundImage = ({
    url,
    width,
    height,
    onClick,
}: {
    url: string
    width?: number
    height?: number
    withLinkOut?: boolean
    onClick?: (event: React.MouseEvent<HTMLElement>) => void
}) => {
    const MAX_WIDTH = 500
    const MAX_HEIGHT = 400
    const ref = useRef<HTMLDivElement>(null)
    const { isTouch } = useDevice()

    const { width: calculatedWidth, height: calculatedHeight } = useRestrictedImageDimensions({
        maxWidth: ref?.current?.offsetWidth || MAX_WIDTH,
        maxHeight: MAX_HEIGHT,
        ref,
        imageWidth: width || 0,
        imageHeight: height || 0,
    })

    return (
        <Box ref={ref}>
            <Box
                data-testid="ratioed-background-image"
                className={containerStyle}
                role="image"
                aria-label={url}
                style={assignInlineVars({
                    maxWidth: `${calculatedWidth}px`,
                    height: `${calculatedHeight}px`,
                    // these are broken up instead of shorthand to avoid an issue with
                    // vanilla-extract in tests
                    backgroundImage: `url(${url})`,
                    backgroundColor: vars.color.background.level3,
                    backgroundPosition: 'center',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                })}
                onClick={isTouch ? undefined : onClick}
            >
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
        </Box>
    )
}
