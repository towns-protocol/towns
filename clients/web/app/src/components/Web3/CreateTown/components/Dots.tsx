import React from 'react'
import { Box, BoxProps, MotionBox } from '@ui'

const noopTrue = () => true

export const Dots = (
    props: {
        slideIndex: number
        slidesLength: number
        onSelectDot: (slideIndex: number) => void
        getDotActive?: (slideIndex: number) => boolean
    } & BoxProps,
) => {
    const { slideIndex, slidesLength, onSelectDot, getDotActive = noopTrue, ...boxProps } = props

    return (
        <Box centerContent paddingX={{ mobile: 'sm', default: 'x4' }} {...boxProps}>
            {Array.from({ length: Math.max(3, slidesLength) })
                .map((_, index) => `section-${index}`)
                .map((sectionId, index) => (
                    <Box
                        centerContent
                        data-testid={`dot-hitarea-${index}`}
                        width="x2"
                        height="x2"
                        key={sectionId}
                        borderRadius="full"
                        onClick={() => getDotActive(index) && onSelectDot?.(index)}
                        {...(slideIndex !== index &&
                            getDotActive(index) && {
                                cursor: 'pointer',
                            })}
                    >
                        <MotionBox
                            width="x1"
                            height="x1"
                            background={getDotActive(index) ? 'level4' : 'level3'}
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
                    </Box>
                ))}
        </Box>
    )
}
