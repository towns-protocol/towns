import React from 'react'
import { Box, BoxProps, MotionBox } from '@ui'

export const Dots = (props: { slideIndex: number; slidesLength: number } & BoxProps) => {
    const { slideIndex, slidesLength, ...boxProps } = props
    return (
        <Box centerContent paddingX={{ mobile: 'sm', default: 'x4' }} gap="sm" {...boxProps}>
            {Array.from({ length: Math.max(3, slidesLength) })
                .map((_, index) => `section-${index}`)
                .map((sectionId, index) => (
                    <MotionBox
                        key={sectionId}
                        width="x1"
                        height="x1"
                        background="level4"
                        borderRadius="full"
                        layout="position"
                    >
                        {slideIndex === index && (
                            <MotionBox
                                layoutId="dot"
                                layout="position"
                                background="cta1"
                                borderRadius="full"
                                width="x1"
                                height="x1"
                            />
                        )}
                    </MotionBox>
                ))}
        </Box>
    )
}
