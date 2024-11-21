import React from 'react'

import { Box, BoxProps, Heading, MotionBox, Paragraph, Stack } from '@ui'

export type SlideLayoutProps = {
    title?: string
    description?: string
    renderLeft?: React.ReactNode
    renderAfter?: React.ReactNode
    slideIndex?: number
    numSlides?: number
    isCurrentSlide?: boolean
}

export const SlideLayout = (props: SlideLayoutProps & BoxProps) => {
    const {
        children,
        renderLeft,
        title,
        description,
        renderAfter,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        slideIndex,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        numSlides,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isCurrentSlide,
        ...boxProps
    } = props

    return (
        <Box
            flexDirection={{ mobile: 'column', desktop: 'row' }}
            justifyContent={{ desktop: 'spaceBetween', mobile: 'center' }}
            gap={{ desktop: 'x4', mobile: 'x8' }}
            width="100%"
            style={{
                scrollSnapAlign: 'center',
                minHeight: 'var(--sizebox-height)',
            }}
            {...boxProps}
        >
            <Box display={{ mobile: 'none' }} />

            <Box top="none" display="block" width={{ desktop: '340', mobile: 'auto' }}>
                {renderLeft}
            </Box>

            <Box centerContent width={{ desktop: '340', mobile: 'auto' }}>
                <Stack
                    gap="lg"
                    width={{ desktop: '340', mobile: '100%' }}
                    paddingX={{ mobile: 'x4', default: 'none' }}
                >
                    {(title || description) && (
                        <MotionBox gap layout="position">
                            {title && <Heading level={3}>{title}</Heading>}
                            {description && (
                                <Paragraph color="gray2" size="sm">
                                    {description}
                                </Paragraph>
                            )}
                        </MotionBox>
                    )}
                    <Stack gap>{children}</Stack>
                    {renderAfter}
                </Stack>
            </Box>

            <Box display={{ mobile: 'none' }} />
        </Box>
    )
}
