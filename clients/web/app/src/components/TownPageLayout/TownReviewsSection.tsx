import React from 'react'
import { Box, Stack, Text } from '@ui'
import { useReviews } from 'hooks/useReviews'
import { ReviewItem } from '@components/TownReviews/ReviewItem'

interface TownReviewsSectionProps {
    spaceId: string
}

export const TownReviewsSection = ({ spaceId }: TownReviewsSectionProps) => {
    const { reviews } = useReviews(spaceId)

    if (reviews.length === 0) {
        return null
    }

    return (
        <Stack gap="md">
            <Text strong size="md">
                {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
            </Text>

            <Stack gap="sm">
                {reviews.slice(0, 20).map((review) => (
                    <Box key={review.id} paddingY="sm">
                        <ReviewItem review={review} />
                    </Box>
                ))}
            </Stack>
        </Stack>
    )
}
