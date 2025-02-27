import { useCallback } from 'react'
import { useTownsClient } from 'use-towns-client'
import { useQuery } from '@tanstack/react-query'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'

interface Review {
    id: string
    author: string
    rating: number
    text: string
    timestamp: string // TODO: Add timestamp from contract if available
}

export const useReviews = (spaceId: string) => {
    const { spaceDapp } = useTownsClient()

    const fetchReviews = useCallback(async (): Promise<Review[]> => {
        if (!spaceId || !spaceDapp) {
            throw new Error('Space not found')
        }

        const web3Space = spaceDapp.getSpace(spaceId)
        if (!web3Space) {
            throw new Error('Space not found')
        }

        try {
            const [users, reviewsData] = await web3Space.Review.getAllReviews()

            return users.map((user, index) => {
                const review = reviewsData[index]
                return {
                    id: user,
                    author: user,
                    rating: review.rating,
                    text: review.comment,
                    timestamp: '', // TODO: Get timestamp
                }
            })
        } catch (contractError) {
            // This is likely a contract not initialized error
            console.error('Contract error:', contractError)
            return []
        }
    }, [spaceId, spaceDapp])

    // Create error handler outside of query options
    const handleError = (error: Error) => {
        popupToast(({ toast }) => {
            return StandardToast({
                toast,
                message: 'Failed to load reviews',
                subMessage: error.message,
                icon: 'alert',
                iconProps: { color: 'error' },
                ctaColor: 'negative',
            })
        })
    }

    const query = useQuery<Review[]>({
        queryKey: ['reviews', spaceId],
        queryFn: fetchReviews,
        refetchOnWindowFocus: false,
    })

    if (query.error) {
        handleError(query.error as Error)
    }

    // Reverse the reviews to show the newest reviews first
    const reviews = [...(query.data || [])].reverse()

    const averageRating =
        reviews.length > 0
            ? reviews.reduce((acc: number, review: Review) => acc + review.rating, 0) /
              reviews.length
            : 0

    return {
        reviews,
        averageRating,
        totalReviews: reviews.length,
        ...query,
    }
}
