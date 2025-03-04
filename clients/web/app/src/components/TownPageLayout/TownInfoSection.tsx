import React from 'react'
import { useSpaceTips } from 'use-towns-client'
import { Box, Icon, Stack, Text } from '@ui'
import { ReviewStars } from '@components/ReviewStars/ReviewStars'
import { useReviews } from 'hooks/useReviews'
import { useEthToUsdFormatted } from '@components/Web3/useEthPrice'
import { useMobile } from 'hooks/useMobile'
import { env } from 'utils'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'

interface TownInfoSectionProps {
    spaceId: string
}

export const TownInfoSection = ({ spaceId }: TownInfoSectionProps) => {
    const { averageRating, totalReviews, isLoading: isReviewsLoading } = useReviews(spaceId)
    const { data: tips, isLoading: isTipsLoading } = useSpaceTips({ spaceId })
    const totalTipsInUsd = useEthToUsdFormatted({
        ethAmount: tips?.amount,
        refetchInterval: 8_000,
    })
    const isMobile = useMobile()

    const hasReviews = totalReviews > 0
    const isReviewsEnabled = env.VITE_REVIEWS_ENABLED
    const isLoading = isReviewsLoading || isTipsLoading

    console.log({ isReviewsEnabled, hasReviews, isMobile, totalReviews })

    return (
        <Stack
            horizontal
            rounded="md"
            paddingX="none"
            paddingY="sm"
            justifyContent="spaceBetween"
            alignItems="center"
            width="100%"
            style={{
                minWidth: isMobile
                    ? '100%'
                    : isReviewsEnabled && (hasReviews || isLoading)
                    ? '450px'
                    : isReviewsEnabled
                    ? '300px'
                    : '50px',
                maxWidth: isMobile
                    ? '100%'
                    : isReviewsEnabled && (hasReviews || isLoading)
                    ? '450px'
                    : '300px',
                border: '1px solid rgba(255, 255, 255, 0.10)',
            }}
        >
            {isReviewsEnabled && (
                <>
                    <Stack
                        grow
                        alignItems="center"
                        position="relative"
                        style={{ flex: 1, height: '80px' }}
                    >
                        <Box
                            position="absolute"
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            top="x4"
                            height="height_lg"
                        >
                            {isLoading ? (
                                <Box
                                    width="x12"
                                    height="x3"
                                    className={shimmerClass}
                                    rounded="xs"
                                />
                            ) : (
                                <ReviewStars rating={hasReviews ? averageRating : 0} size={16} />
                            )}
                        </Box>
                        <Box
                            position="absolute"
                            top="lg"
                            width="100%"
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                        >
                            {isLoading ? (
                                <Box width="x6" height="x3" className={shimmerClass} rounded="xs" />
                            ) : hasReviews ? (
                                <Text
                                    size="lg"
                                    fontWeight="strong"
                                    textAlign="center"
                                    style={{ lineHeight: 0.5 }}
                                >
                                    {averageRating.toFixed(1)}
                                </Text>
                            ) : (
                                <Text
                                    size="lg"
                                    fontWeight="strong"
                                    textAlign="center"
                                    style={{ lineHeight: 0.5 }}
                                >
                                    No Reviews
                                </Text>
                            )}
                        </Box>
                    </Stack>

                    {(hasReviews || isLoading) && (
                        <>
                            <Box
                                style={{
                                    width: '1px',
                                    height: '72px',
                                    background: 'rgba(255, 255, 255, 0.10)',
                                }}
                            />

                            <Stack
                                grow
                                alignItems="center"
                                position="relative"
                                style={{ flex: 1, height: '80px' }}
                            >
                                <Box
                                    position="absolute"
                                    top="lg"
                                    width="100%"
                                    display="flex"
                                    justifyContent="center"
                                    alignItems="center"
                                >
                                    {isLoading ? (
                                        <Box
                                            width="x4"
                                            height="x3"
                                            className={shimmerClass}
                                            rounded="xs"
                                        />
                                    ) : (
                                        <Text
                                            size="lg"
                                            fontWeight="strong"
                                            textAlign="center"
                                            style={{ lineHeight: 0.5 }}
                                        >
                                            {totalReviews}
                                        </Text>
                                    )}
                                </Box>
                                <Box
                                    position="absolute"
                                    display="flex"
                                    justifyContent="center"
                                    alignItems="center"
                                    top="x4"
                                    height="height_lg"
                                >
                                    {isLoading ? (
                                        <Box
                                            width="x6"
                                            height="x2"
                                            className={shimmerClass}
                                            rounded="xs"
                                        />
                                    ) : (
                                        <Text size="sm" color="gray1">
                                            {totalReviews === 1 ? 'Review' : 'Reviews'}
                                        </Text>
                                    )}
                                </Box>
                            </Stack>
                        </>
                    )}

                    <Box
                        style={{
                            width: '1px',
                            height: '72px',
                            background: 'rgba(255, 255, 255, 0.10)',
                        }}
                    />
                </>
            )}

            <Stack grow alignItems="center" position="relative" style={{ flex: 1, height: '80px' }}>
                <Box
                    position="absolute"
                    top="lg"
                    width="100%"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                >
                    {isLoading ? (
                        <Box width="x8" height="x3" className={shimmerClass} rounded="xs" />
                    ) : (
                        <Text
                            size="lg"
                            fontWeight="strong"
                            textAlign="center"
                            style={{ lineHeight: 0.5 }}
                        >
                            {totalTipsInUsd || '$0.00'}
                        </Text>
                    )}
                </Box>
                <Box
                    position="absolute"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    top="x4"
                    height="height_lg"
                >
                    {isLoading ? (
                        <Stack horizontal alignItems="center" gap="xs">
                            <Box width="x3" height="x3" className={shimmerClass} rounded="full" />
                            <Box width="x8" height="x2" className={shimmerClass} rounded="xs" />
                        </Stack>
                    ) : (
                        <Stack horizontal alignItems="center" gap="xs">
                            <Icon type="dollarFilled" color="cta1" size="square_sm" />
                            <Text size="sm" color="gray1">
                                Tips Sent
                            </Text>
                        </Stack>
                    )}
                </Box>
            </Stack>
        </Stack>
    )
}
