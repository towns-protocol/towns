import React, { useState } from 'react'
import {
    BlockchainTransactionType,
    useConnectivity,
    useIsTransactionPending,
    useReviewTransaction,
    useSpaceData,
} from 'use-towns-client'
import { HoverableReviewStars } from '@components/ReviewStars/ReviewStars'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Button, FormRender, Stack, Text } from '@ui'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { Analytics } from 'hooks/useAnalytics'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { validateReview } from './reviewModerator'

interface WriteReviewModalProps {
    onHide: () => void
    initialReview?: {
        rating: number
        text: string
    }
    onSubmit?: (review: { rating: number; text: string }) => void
    townName: string
    townDescription?: string
}

interface ReviewFormData {
    rating: number
    text: string
}

const MIN_REVIEW_LENGTH = 10
const MAX_REVIEW_LENGTH = 4000

export const WriteReviewModal = ({
    onHide,
    initialReview,
    onSubmit,
    townName,
    townDescription,
}: WriteReviewModalProps) => {
    const [validationError, setValidationError] = useState<string | null>(null)
    const [isValidating, setIsValidating] = useState(false)
    const spaceData = useSpaceData()
    const spaceDetails = useGatherSpaceDetailsAnalytics({ spaceId: spaceData?.id })
    const { loggedInWalletAddress } = useConnectivity()
    const { data: myAbstractAccount } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })
    const { review, isLoading: isSubmitting } = useReviewTransaction()
    const reviewPending = useIsTransactionPending(BlockchainTransactionType.Review)

    const handleSubmit = async (data: { rating: number; text: string }, getSigner: GetSigner) => {
        setIsValidating(true)
        setValidationError(null)

        try {
            // Validate review content
            const validationResult = await validateReview(data.text, {
                name: townName,
                description: townDescription,
            })
            if (!validationResult.valid) {
                setValidationError(validationResult.reason || 'Invalid review')
                return
            }

            const signer = await getSigner()
            if (!signer) {
                createPrivyNotAuthenticatedNotification()
                return
            }

            if (!spaceData?.id) {
                popupToast(({ toast }) => (
                    <StandardToast.Error message="Space not found" toast={toast} />
                ))
                return
            }

            if (!myAbstractAccount) {
                popupToast(({ toast }) => (
                    <StandardToast.Error message="Account not found" toast={toast} />
                ))
                return
            }

            Analytics.getInstance().track('clicked submit review', {
                starRating: data.rating,
                spaceName: spaceData.name,
                spaceId: spaceData.id,
                gatedSpace: spaceDetails.gatedSpace,
                gatedChannel: spaceDetails.gatedChannel,
                pricingModule: spaceDetails.pricingModule,
            })

            await review(
                {
                    spaceId: spaceData.id,
                    rating: data.rating,
                    comment: data.text,
                    isUpdate: !!initialReview,
                    signer,
                    senderAddress: myAbstractAccount,
                },
                {
                    onSuccess: () => {
                        onSubmit?.(data)
                        onHide()
                        popupToast(({ toast }) => (
                            <StandardToast.Success
                                message={
                                    initialReview
                                        ? 'Review updated successfully'
                                        : 'Review posted successfully'
                                }
                                toast={toast}
                            />
                        ))
                    },
                    onError: (error) => {
                        const errorMessage = 'Failed to submit review'
                        const subMessage = 'Please try again.'

                        popupToast(({ toast }) => (
                            <StandardToast.Error
                                message={errorMessage}
                                subMessage={subMessage}
                                toast={toast}
                            />
                        ))
                    },
                },
            )
        } catch (error) {
            console.error('Error submitting review:', error)
            setValidationError('Error submitting review')
        } finally {
            setIsValidating(false)
        }
    }

    return (
        <ModalContainer
            touchTitle={initialReview ? 'Edit Review' : 'Write a Review'}
            padding="none"
            onHide={onHide}
        >
            <Box padding="lg" style={{ width: '600px', maxWidth: 'calc(100vw - 32px)' }}>
                <FormRender<ReviewFormData>
                    defaultValues={{
                        rating: initialReview?.rating ?? 0,
                        text: initialReview?.text ?? '',
                    }}
                >
                    {({ register, watch, setValue }) => {
                        const reviewText = watch('text')
                        const characterCount = reviewText.length
                        const isTextValid =
                            characterCount >= MIN_REVIEW_LENGTH &&
                            characterCount <= MAX_REVIEW_LENGTH

                        return (
                            <Stack gap="lg">
                                <Stack alignItems="center" gap="md">
                                    <HoverableReviewStars
                                        size={32}
                                        initialRating={watch('rating')}
                                        onChange={(rating) => setValue('rating', rating)}
                                    />
                                    <Text color="gray2">
                                        {watch('rating') === 0
                                            ? 'Select your rating'
                                            : `${watch('rating')} out of 5 stars`}
                                    </Text>
                                </Stack>

                                <Stack gap="md">
                                    <Stack
                                        horizontal
                                        justifyContent="spaceBetween"
                                        alignItems="center"
                                    >
                                        <Text strong>Your Review</Text>
                                        <Text
                                            size="sm"
                                            color="gray2"
                                        >{`${characterCount}/${MIN_REVIEW_LENGTH} characters minimum`}</Text>
                                    </Stack>

                                    <Box
                                        border
                                        as="textarea"
                                        background="level2"
                                        color="default"
                                        padding="md"
                                        rounded="sm"
                                        style={{
                                            width: '100%',
                                            minHeight: '120px',
                                            resize: 'vertical',
                                        }}
                                        minLength={MIN_REVIEW_LENGTH}
                                        maxLength={MAX_REVIEW_LENGTH}
                                        {...register('text', {
                                            required: true,
                                            minLength: MIN_REVIEW_LENGTH,
                                            maxLength: MAX_REVIEW_LENGTH,
                                        })}
                                    />

                                    {validationError && (
                                        <Text
                                            color="error"
                                            size="sm"
                                            style={{ wordBreak: 'break-word' }}
                                        >
                                            {validationError}
                                        </Text>
                                    )}
                                </Stack>

                                <Stack horizontal gap="sm" justifyContent="end">
                                    <Button tone="level2" onClick={onHide}>
                                        Cancel
                                    </Button>
                                    <WalletReady>
                                        {({ getSigner }) => (
                                            <Button
                                                disabled={
                                                    watch('rating') === 0 ||
                                                    !isTextValid ||
                                                    isValidating ||
                                                    isSubmitting ||
                                                    !myAbstractAccount ||
                                                    reviewPending
                                                }
                                                tone="cta1"
                                                onClick={() =>
                                                    handleSubmit(
                                                        {
                                                            rating: watch('rating'),
                                                            text: watch('text'),
                                                        },
                                                        getSigner,
                                                    )
                                                }
                                            >
                                                {isSubmitting
                                                    ? 'Submitting...'
                                                    : isValidating
                                                    ? 'Validating...'
                                                    : reviewPending
                                                    ? 'Review Pending...'
                                                    : initialReview
                                                    ? 'Update Review'
                                                    : 'Post Review'}
                                            </Button>
                                        )}
                                    </WalletReady>
                                </Stack>
                            </Stack>
                        )
                    }}
                </FormRender>
            </Box>
        </ModalContainer>
    )
}
