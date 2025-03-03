import React from 'react'
import { useSpaceTips } from 'use-towns-client'
import { Box, Icon, Stack, Text } from '@ui'
import { ReviewStars } from '@components/ReviewStars/ReviewStars'
import { useReviews } from 'hooks/useReviews'
import { useEthToUsdFormatted } from '@components/Web3/useEthPrice'
import { useMobile } from 'hooks/useMobile'

interface TownInfoSectionProps {
    spaceId: string
}

export const TownInfoSection = ({ spaceId }: TownInfoSectionProps) => {
    const { averageRating, totalReviews } = useReviews(spaceId)
    const { data: tips } = useSpaceTips({ spaceId })
    const totalTipsInUsd = useEthToUsdFormatted({
        ethAmount: tips?.amount,
        refetchInterval: 8_000,
    })
    const isMobile = useMobile()

    const hasReviews = totalReviews > 0

    return (
        <Stack
            horizontal
            border="level4"
            rounded="md"
            paddingX="none"
            paddingY="sm"
            justifyContent="spaceBetween"
            alignItems="center"
            width="100%"
            style={{
                minWidth: isMobile ? '100%' : hasReviews ? '450px' : '300px',
            }}
        >
            <Stack grow alignItems="center" position="relative" style={{ flex: 1, height: '80px' }}>
                <Box
                    position="absolute"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    top="x4"
                    height="height_lg"
                >
                    <ReviewStars rating={hasReviews ? averageRating : 0} size={16} />
                </Box>
                <Box
                    position="absolute"
                    top="lg"
                    width="100%"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                >
                    {hasReviews ? (
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

            {hasReviews && (
                <>
                    <Box style={{ width: '1px', height: '72px' }} background="level4" />

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
                            <Text
                                size="lg"
                                fontWeight="strong"
                                textAlign="center"
                                style={{ lineHeight: 0.5 }}
                            >
                                {totalReviews}
                            </Text>
                        </Box>
                        <Box
                            position="absolute"
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            top="x4"
                            height="height_lg"
                        >
                            <Text size="sm" color="gray1">
                                {totalReviews === 1 ? 'Review' : 'Reviews'}
                            </Text>
                        </Box>
                    </Stack>
                </>
            )}

            <Box style={{ width: '1px', height: '72px' }} background="level4" />

            <Stack grow alignItems="center" position="relative" style={{ flex: 1, height: '80px' }}>
                <Box
                    position="absolute"
                    top="lg"
                    width="100%"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                >
                    <Text
                        size="lg"
                        fontWeight="strong"
                        textAlign="center"
                        style={{ lineHeight: 0.5 }}
                    >
                        {totalTipsInUsd || '$0.00'}
                    </Text>
                </Box>
                <Box
                    position="absolute"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    top="x4"
                    height="height_lg"
                >
                    <Stack horizontal alignItems="center" gap="xs">
                        <Icon type="dollarFilled" color="cta1" size="square_sm" />
                        <Text size="sm" color="gray1">
                            Tips Sent
                        </Text>
                    </Stack>
                </Box>
            </Stack>
        </Stack>
    )
}
