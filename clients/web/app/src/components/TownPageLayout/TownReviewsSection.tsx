import React, { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { Box, Stack, Text } from '@ui'
import { useReviews } from 'hooks/useReviews'
import { ReviewItem } from '@components/TownReviews/ReviewItem'
import { env } from 'utils'

interface TownReviewsSectionProps {
    spaceId: string
}

const REVIEWS_PER_PAGE = 20

export const TownReviewsSection = ({ spaceId }: TownReviewsSectionProps) => {
    const { reviews } = useReviews(spaceId)
    const [visibleReviews, setVisibleReviews] = useState(REVIEWS_PER_PAGE)

    const { ref: loadMoreRef, inView } = useInView({
        threshold: 0.5,
        triggerOnce: false,
    })

    useEffect(() => {
        if (inView && visibleReviews < reviews.length) {
            setVisibleReviews((prev) => Math.min(prev + REVIEWS_PER_PAGE, reviews.length))
        }
    }, [inView, visibleReviews, reviews.length])

    const isReviewsEnabled = env.VITE_REVIEWS_ENABLED

    if (reviews.length === 0 || !isReviewsEnabled) {
        return null
    }

    return (
        <Stack gap="md">
            <Text strong size="md">
                {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
            </Text>

            <Stack gap="sm">
                {reviews.slice(0, visibleReviews).map((review) => (
                    <Box key={review.id} paddingY="sm">
                        <ReviewItem review={review} />
                    </Box>
                ))}
                {visibleReviews < reviews.length && <Box ref={loadMoreRef} height="x4" />}
            </Stack>
        </Stack>
    )
}
