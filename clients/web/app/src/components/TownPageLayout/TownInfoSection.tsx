import React, { useMemo } from 'react'
import { useSpaceTips } from 'use-towns-client'
import { Box, Icon, Stack, Text } from '@ui'
import { ReviewStars } from '@components/ReviewStars/ReviewStars'
import { useReviews } from 'hooks/useReviews'
import { useEthToUsdFormatted } from '@components/Web3/useEthPrice'
import { useMobile } from 'hooks/useMobile'
import { env } from 'utils'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { useEntitlements } from 'hooks/useEntitlements'
import { minterRoleId } from '@components/SpaceSettingsPanel/rolePermissions.const'
import { EntitlementsDisplay } from './EntitlementsDisplay'
import { useReadableMembershipInfo } from './useReadableMembershipInfo'
import { getPriceText } from './townPageUtils'

interface TownInfoSectionProps {
    spaceId: string
}

export const TownInfoSection = ({ spaceId }: TownInfoSectionProps) => {
    const { averageRating, totalReviews, isLoading: isReviewsLoading } = useReviews(spaceId)
    const { data: tips, isLoading: isTipsLoading } = useSpaceTips({ spaceId })
    const { data: entitlements, isLoading: isEntitlementsLoading } = useEntitlements(
        spaceId,
        minterRoleId,
    )
    const totalTipsInUsd = useEthToUsdFormatted({
        ethAmount: tips?.amount,
        refetchInterval: 8_000,
    })
    const { data: membershipInfo, isLoading: isMembershipInfoLoading } = useReadableMembershipInfo(
        spaceId ?? '',
    )
    const isMobile = useMobile()

    const hasReviews = totalReviews > 0
    const isReviewsEnabled = env.VITE_REVIEWS_ENABLED

    const price = useMemo(() => {
        if (!membershipInfo) {
            return 'Free'
        }

        const priceText = getPriceText(membershipInfo.price, membershipInfo.remainingFreeSupply)
        return priceText?.value
    }, [membershipInfo])

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
                minWidth: isMobile ? '100%' : '450px',
                maxWidth: isMobile ? '100%' : '450px',
                border: '1px solid rgba(255, 255, 255, 0.10)',
            }}
        >
            {/* Reviews Section */}
            {isReviewsEnabled && (
                <Stack
                    grow
                    alignItems="center"
                    position="relative"
                    style={{ flex: 1, height: '100px' }}
                    gap="sm"
                >
                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        height="height_lg"
                    >
                        <Text
                            size="sm"
                            color="gray2"
                            textTransform="uppercase"
                            fontWeight="strong"
                            style={{
                                letterSpacing: -0.8,
                            }}
                        >
                            {totalReviews !== 0 && `${totalReviews} `}
                            {totalReviews === 0 && 'No '}Review
                            {totalReviews !== 1 && 's'}
                        </Text>
                    </Box>
                    <Box width="100%" display="flex" justifyContent="center" alignItems="center">
                        {isReviewsLoading ? (
                            <Box width="x6" height="x3" className={shimmerClass} rounded="xs" />
                        ) : (
                            <Text
                                size="lg"
                                fontWeight="strong"
                                textAlign="center"
                                style={{ lineHeight: 0.5 }}
                            >
                                {averageRating.toFixed(1)}
                            </Text>
                        )}
                    </Box>
                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        height="height_lg"
                    >
                        {isReviewsLoading ? (
                            <Box width="x12" height="x3" className={shimmerClass} rounded="xs" />
                        ) : (
                            <ReviewStars rating={hasReviews ? averageRating : 0} size={16} />
                        )}
                    </Box>
                </Stack>
            )}

            {/* Membership Section */}
            <Box
                style={{
                    width: '1px',
                    height: '88px',
                    background: 'rgba(255, 255, 255, 0.10)',
                }}
            />

            <Stack
                grow
                alignItems="center"
                position="relative"
                style={{ flex: 1, height: '100px' }}
                gap="sm"
            >
                <Box display="flex" justifyContent="center" alignItems="center" height="height_lg">
                    <Text
                        size="sm"
                        color="gray2"
                        textTransform="uppercase"
                        fontWeight="strong"
                        style={{
                            letterSpacing: -0.8,
                            marginTop: '2px',
                        }}
                    >
                        Entry
                    </Text>
                </Box>
                <Box width="100%" display="flex" justifyContent="center" alignItems="center">
                    {isMembershipInfoLoading || isEntitlementsLoading ? (
                        <Box width="x8" height="x2" className={shimmerClass} rounded="xs" />
                    ) : entitlements.hasEntitlements ? (
                        <EntitlementsDisplay entitlements={entitlements} />
                    ) : (
                        <Text
                            size="lg"
                            fontWeight="strong"
                            textAlign="center"
                            style={{ lineHeight: 0.5 }}
                        >
                            {price}
                        </Text>
                    )}
                </Box>
                <Box
                    width="100%"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    height="height_lg"
                >
                    {isEntitlementsLoading || isMembershipInfoLoading ? (
                        <Box width="x8" height="x2" className={shimmerClass} rounded="xs" />
                    ) : (
                        <Box
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            height="height_lg"
                        >
                            <Text size="sm" color="gray2">
                                {entitlements.hasEntitlements
                                    ? 'Gated'
                                    : price === 'Free'
                                    ? 'Membership'
                                    : 'ETH'}
                            </Text>
                        </Box>
                    )}
                </Box>
            </Stack>

            <Box
                style={{
                    width: '1px',
                    height: '88px',
                    background: 'rgba(255, 255, 255, 0.10)',
                }}
            />

            {/* Tips Section */}
            <Stack
                grow
                alignItems="center"
                position="relative"
                style={{ flex: 1, height: '100px' }}
            >
                <Box display="flex" justifyContent="center" alignItems="center" height="height_lg">
                    <Text
                        size="sm"
                        color="gray2"
                        textTransform="uppercase"
                        fontWeight="strong"
                        style={{
                            letterSpacing: -0.8,
                        }}
                    >
                        Tips
                    </Text>
                </Box>
                <Box width="100%" display="flex" justifyContent="center" alignItems="center">
                    {isTipsLoading ? (
                        <Stack horizontal alignItems="center" gap="xs">
                            <Box width="x3" height="x3" className={shimmerClass} rounded="full" />
                            <Box width="x8" height="x3" className={shimmerClass} rounded="xs" />
                        </Stack>
                    ) : (
                        <Stack horizontal alignItems="center" gap="xs">
                            <Icon type="dollarFilled" color="cta1" size="square_sm" />
                            <Text
                                size="lg"
                                fontWeight="strong"
                                textAlign="center"
                                style={{ lineHeight: 0.5 }}
                            >
                                {totalTipsInUsd || '$0.00'}
                            </Text>
                        </Stack>
                    )}
                </Box>
                <Box display="flex" justifyContent="center" alignItems="center" height="height_lg">
                    {isTipsLoading ? (
                        <Box width="x8" height="x2" className={shimmerClass} rounded="xs" />
                    ) : (
                        <Text size="sm" color="gray2" style={{ marginTop: '-8px' }}>
                            Sent
                        </Text>
                    )}
                </Box>
            </Stack>
        </Stack>
    )
}
