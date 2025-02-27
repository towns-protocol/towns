import React, { useState } from 'react'
import { Box, Icon, Stack } from '@ui'

interface ReviewStarsProps {
    /**
     * Rating value between 0 and 5
     */
    rating: number
    /**
     * Size of each star icon in pixels
     */
    size?: number
}

interface HoverableReviewStarsProps extends Omit<ReviewStarsProps, 'rating'> {
    /**
     * Current rating value
     */
    initialRating: number
    /**
     * Callback when rating changes
     */
    onChange: (rating: number) => void
}

const getIconSize = (size: number) => {
    if (size <= 16) {
        return 'square_xs'
    }
    if (size <= 20) {
        return 'square_sm'
    }
    if (size <= 24) {
        return 'square_md'
    }
    return 'square_lg'
}

export const ReviewStars = ({ rating, size = 20 }: ReviewStarsProps) => {
    const iconSize = getIconSize(size)
    return (
        <Stack horizontal gap="none">
            {[0, 1, 2, 3, 4].map((i) => {
                const filled = Math.min(Math.max(rating - i, 0), 1)
                return (
                    <Box key={i} position="relative" style={{ width: size, height: size }}>
                        <Box position="absolute">
                            <Icon type="star" size={iconSize} color="gray2" />
                        </Box>
                        {filled > 0 && (
                            <Box
                                position="absolute"
                                style={{
                                    width: `${filled * 100}%`,
                                    overflow: 'hidden',
                                }}
                            >
                                <Icon type="starFilled" size={iconSize} color="default" />
                            </Box>
                        )}
                    </Box>
                )
            })}
        </Stack>
    )
}

export const HoverableReviewStars = ({
    initialRating,
    onChange,
    size = 20,
}: HoverableReviewStarsProps) => {
    const [hoverRating, setHoverRating] = useState<number | null>(null)
    const iconSize = getIconSize(size)

    const displayRating = hoverRating ?? initialRating

    return (
        <Stack horizontal gap="none" cursor="pointer" onMouseLeave={() => setHoverRating(null)}>
            {[0, 1, 2, 3, 4].map((i) => {
                const filled = Math.min(Math.max(displayRating - i, 0), 1)
                return (
                    <Box
                        key={i}
                        position="relative"
                        style={{ width: size, height: size }}
                        onMouseEnter={() => setHoverRating(i + 1)}
                        onClick={() => onChange(i + 1)}
                    >
                        <Box position="absolute">
                            <Icon type="star" size={iconSize} color="gray2" />
                        </Box>
                        {filled > 0 && (
                            <Box
                                position="absolute"
                                style={{
                                    width: `${filled * 100}%`,
                                    overflow: 'hidden',
                                }}
                            >
                                <Icon
                                    type="starFilled"
                                    size={iconSize}
                                    color={hoverRating !== null ? 'cta2' : 'default'}
                                />
                            </Box>
                        )}
                    </Box>
                )
            })}
        </Stack>
    )
}
