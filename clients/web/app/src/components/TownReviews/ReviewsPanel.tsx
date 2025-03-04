import React, { useCallback, useMemo, useState } from 'react'
import {
    BlockchainTransactionType,
    useConnectivity,
    useContractSpaceInfo,
    useIsTransactionPending,
    useReviewTransaction,
    useSpaceData,
} from 'use-towns-client'
import { Box, Button, Divider, Icon, IconButton, MotionStack, Stack, Text } from '@ui'
import { ReviewStars } from '@components/ReviewStars/ReviewStars'
import { Panel } from '@components/Panel/Panel'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { useReviews } from 'hooks/useReviews'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { useContainerWidth } from 'ui/hooks/useContainerWidth'
import { WriteReviewModal } from './WriteReviewModal'
import { ReviewItem } from './ReviewItem'

// Animation for the action buttons
const actionButtonsAnimation = {
    rest: { opacity: 0 },
    hover: { opacity: 1 },
}

export const ReviewsPanel = () => {
    const { loggedInWalletAddress } = useConnectivity()

    const { data: aaAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const space = useSpaceData()
    const { data: contractSpaceInfo } = useContractSpaceInfo(space?.id)
    const [sortBy, setSortBy] = useState<'recommended' | 'recent'>('recent')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [activeModal, setActiveModal] = useState<{
        type: 'write' | 'edit'
        review?: {
            id: string
            rating: number
            text: string
        }
    } | null>(null)

    const { reviews, averageRating, totalReviews, isLoading, error, refetch } = useReviews(
        space?.id ?? '',
    )

    const sortedReviews = useMemo(() => {
        if (sortBy === 'recommended') {
            // Sort by rating (highest to lowest)
            return [...reviews].sort((a, b) => b.rating - a.rating)
        }
        return reviews
    }, [reviews, sortBy])

    const { review, isLoading: isSubmittingReview } = useReviewTransaction()
    const reviewPending = useIsTransactionPending(BlockchainTransactionType.Review)

    const handleEditReview = useCallback(
        (reviewId: string) => {
            const review = sortedReviews.find((r) => r.id === reviewId)
            if (review) {
                setActiveModal({
                    type: 'edit',
                    review: {
                        id: reviewId,
                        rating: review.rating,
                        text: review.text,
                    },
                })
            }
        },
        [sortedReviews],
    )

    const handleSubmitReview = useCallback(async () => {
        await refetch()
    }, [refetch])

    const handleDeleteReview = useCallback(
        async (getSigner: GetSigner) => {
            try {
                const signer = await getSigner()
                if (!signer) {
                    createPrivyNotAuthenticatedNotification()
                    return
                }

                if (!space?.id) {
                    popupToast(({ toast }) => (
                        <StandardToast.Error message="Space not found" toast={toast} />
                    ))
                    return
                }

                if (!aaAddress) {
                    popupToast(({ toast }) => (
                        <StandardToast.Error message="No abstract account address" toast={toast} />
                    ))
                    return
                }

                await review(
                    {
                        spaceId: space.id,
                        rating: 0,
                        comment: '',
                        isDelete: true,
                        signer,
                        senderAddress: aaAddress,
                    },
                    {
                        onSuccess: () => {
                            refetch()
                            popupToast(({ toast }) => (
                                <StandardToast.Success
                                    message="Review deleted successfully"
                                    toast={toast}
                                />
                            ))
                        },
                        onError: (error: Error) => {
                            console.error('Error deleting review:', error)
                            popupToast(({ toast }) => (
                                <StandardToast.Error
                                    message="Failed to delete review"
                                    subMessage="Please try again."
                                    toast={toast}
                                />
                            ))
                        },
                    },
                )
            } catch (error) {
                console.error('Error deleting review:', error)
                popupToast(({ toast }) => (
                    <StandardToast.Error message="Failed to delete review" toast={toast} />
                ))
            }
        },
        [space?.id, aaAddress, review, refetch],
    )

    const isUserReview = useCallback(
        (reviewAuthor: string) => {
            return reviewAuthor === aaAddress
        },
        [aaAddress],
    )

    // Check if the current user has already left a review
    const userReview = aaAddress
        ? sortedReviews.find((review) => review.author === aaAddress)
        : undefined

    const { ref: containerRef, width: containerWidth } = useContainerWidth()
    const isNarrow = containerWidth > 0 && containerWidth < 430

    return (
        <Panel label="Reviews" padding="none" paddingX="none" paddingTop="sm">
            <Stack gap="md" ref={containerRef}>
                <Stack paddingX="lg" paddingY="md" gap="lg">
                    <Stack
                        direction={isNarrow ? 'columnReverse' : 'row'}
                        justifyContent="spaceBetween"
                        alignItems={isNarrow ? 'start' : 'center'}
                        gap={isNarrow ? 'md' : undefined}
                    >
                        <Stack horizontal gap="md" alignItems="center">
                            <Text strong size="h1">
                                {averageRating.toFixed(1)}
                            </Text>
                            <Stack gap="sm">
                                <ReviewStars rating={averageRating} size={24} />
                                <Text color="gray2">
                                    {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
                                </Text>
                            </Stack>
                        </Stack>
                        <Box width={isNarrow ? '100%' : undefined}>
                            <Button
                                tone="cta1"
                                width={isNarrow ? '100%' : 'x20'}
                                onClick={() =>
                                    userReview
                                        ? handleEditReview(userReview.id)
                                        : setActiveModal({ type: 'write' })
                                }
                            >
                                {userReview ? 'Edit Review' : 'Write a Review'}
                            </Button>
                        </Box>
                    </Stack>
                </Stack>

                <Box style={{ marginTop: '-6px', marginBottom: '-6px' }}>
                    <Divider
                        space="none"
                        label={
                            <Box position="relative">
                                <Stack
                                    hoverable
                                    horizontal
                                    alignItems="center"
                                    background="level2"
                                    cursor="pointer"
                                    gap="sm"
                                    justifyContent="center"
                                    paddingX="md"
                                    paddingY="sm"
                                    rounded="sm"
                                    style={{ minWidth: 'fit-content' }}
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                >
                                    <Text>
                                        {sortBy === 'recommended' ? 'Recommended' : 'Recent'}
                                    </Text>
                                    <Icon type="arrowDown" size="square_sm" color="gray2" />
                                </Stack>
                                {isDropdownOpen && (
                                    <Stack
                                        border
                                        background="level1"
                                        cursor="pointer"
                                        rounded="sm"
                                        zIndex="tooltips"
                                        position="absoluteCenter"
                                        overflow="hidden"
                                        minWidth="x20"
                                        top="x8"
                                    >
                                        <Stack
                                            hoverable
                                            background={{
                                                default:
                                                    sortBy === 'recommended' ? 'level2' : undefined,
                                                hover: 'level3',
                                            }}
                                            paddingX="md"
                                            paddingY="sm"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSortBy('recommended')
                                                setIsDropdownOpen(false)
                                            }}
                                        >
                                            <Text>Recommended</Text>
                                        </Stack>
                                        <Divider space="none" />
                                        <Stack
                                            hoverable
                                            background={{
                                                default: sortBy === 'recent' ? 'level2' : undefined,
                                                hover: 'level3',
                                            }}
                                            paddingX="md"
                                            paddingY="sm"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSortBy('recent')
                                                setIsDropdownOpen(false)
                                            }}
                                        >
                                            <Text>Recent</Text>
                                        </Stack>
                                    </Stack>
                                )}
                            </Box>
                        }
                    />
                </Box>

                <Stack gap="none" padding="none">
                    {isLoading ? (
                        <Stack padding="lg">
                            <Text color="gray2">Loading reviews...</Text>
                        </Stack>
                    ) : error ? (
                        <Stack padding="lg">
                            <Text color="error">
                                Error loading reviews: {(error as Error).message}
                            </Text>
                        </Stack>
                    ) : sortedReviews.length === 0 ? (
                        <Stack padding="lg">
                            <Text color="gray2">No reviews yet. Be the first to write one!</Text>
                        </Stack>
                    ) : (
                        sortedReviews.map((review) => {
                            const isAuthor = isUserReview(review.author)

                            return (
                                <MotionStack
                                    hoverable
                                    key={review.id}
                                    initial="rest"
                                    whileHover="hover"
                                    background={{
                                        hover: 'level2',
                                    }}
                                    paddingX="lg"
                                    paddingY="md"
                                >
                                    <ReviewItem
                                        showActions
                                        review={review}
                                        renderActions={(reviewId) =>
                                            isAuthor && (
                                                <MotionStack
                                                    variants={actionButtonsAnimation}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <Box padding="xs">
                                                        <Stack
                                                            border
                                                            hoverable
                                                            horizontal
                                                            alignItems="center"
                                                            background="level1"
                                                            color="gray2"
                                                            gap="xs"
                                                            padding="xs"
                                                            rounded="sm"
                                                        >
                                                            <IconButton
                                                                icon="edit"
                                                                color="gray2"
                                                                size="square_sm"
                                                                tooltip="Edit Review"
                                                                onClick={() =>
                                                                    handleEditReview(reviewId)
                                                                }
                                                            />
                                                            <WalletReady>
                                                                {({ getSigner }) => (
                                                                    <IconButton
                                                                        icon="delete"
                                                                        color="error"
                                                                        size="square_sm"
                                                                        tooltip="Delete Review"
                                                                        hoverColor="error"
                                                                        disabled={
                                                                            isSubmittingReview ||
                                                                            reviewPending
                                                                        }
                                                                        onClick={() =>
                                                                            handleDeleteReview(
                                                                                getSigner,
                                                                            )
                                                                        }
                                                                    />
                                                                )}
                                                            </WalletReady>
                                                        </Stack>
                                                    </Box>
                                                </MotionStack>
                                            )
                                        }
                                    />
                                </MotionStack>
                            )
                        })
                    )}
                </Stack>

                {activeModal && (
                    <WriteReviewModal
                        initialReview={
                            activeModal.type === 'edit' && activeModal.review
                                ? activeModal.review
                                : undefined
                        }
                        townName={space?.name ?? ''}
                        townDescription={contractSpaceInfo?.shortDescription}
                        onHide={() => setActiveModal(null)}
                        onSubmit={handleSubmitReview}
                    />
                )}
            </Stack>
        </Panel>
    )
}
