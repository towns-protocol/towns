import React from 'react'
import { useEvent } from 'react-use-event-hook'
import { Box, Paragraph, Stack, Text, TextButton } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { ReviewStars } from '@components/ReviewStars/ReviewStars'
import { env } from 'utils'
import { useReviews } from 'hooks/useReviews'

interface TownReviewsProps {
    setActiveModal: (modal: 'reviews' | null) => void
    spaceId: string | undefined
}

export const TownReviews = ({ setActiveModal, spaceId }: TownReviewsProps) => {
    const { openPanel } = usePanelActions()
    const { isTouch } = useDevice()
    const { averageRating, totalReviews } = useReviews(spaceId ?? '')

    const onShowReviews = useEvent(() => {
        if (isTouch) {
            setActiveModal('reviews')
        } else {
            openPanel(CHANNEL_INFO_PARAMS.REVIEWS)
        }
    })

    if (!env.VITE_REVIEWS_ENABLED) {
        return null
    }

    return (
        <Stack padding="md" gap="sm" background="level2" rounded="sm">
            <Stack horizontal justifyContent="spaceBetween">
                <Paragraph strong color="default">
                    Reviews
                </Paragraph>
                <TextButton onClick={onShowReviews}>
                    {totalReviews === 0 ? 'Write Review' : 'View All'}
                </TextButton>
            </Stack>
            <Box cursor="pointer" width="fit-content" onClick={onShowReviews}>
                <Stack horizontal gap="sm" alignItems="center">
                    <ReviewStars rating={averageRating} />
                    <Text as="span">
                        {totalReviews === 0 ? (
                            <Text color="gray2">No Reviews</Text>
                        ) : (
                            <>
                                {averageRating.toFixed(1)}{' '}
                                <Text color="gray2" display="inline" as="span">
                                    ({totalReviews})
                                </Text>
                            </>
                        )}
                    </Text>
                </Stack>
            </Box>
        </Stack>
    )
}
