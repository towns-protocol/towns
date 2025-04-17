import React, { useCallback, useMemo } from 'react'
import {
    SpaceIdFromSpaceAddress,
    useContractSpaceInfoWithoutClient,
    useMyMembership,
} from 'use-towns-client'
import { useNavigate } from 'react-router-dom'
import { Membership } from '@towns-protocol/sdk'
import { useReadableMembershipInfo } from '@components/TownPageLayout/useReadableMembershipInfo'
import { InteractiveSpaceIcon } from '@components/SpaceIcon/SpaceIcon'
import { Box, Heading, Icon, MotionBox, Paragraph, Pill, Stack, Text } from '@ui'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { Analytics } from 'hooks/useAnalytics'
import { PATHS } from 'routes'
import { useEntitlements } from 'hooks/useEntitlements'
import { formatUnitsToFixedLength, parseUnits } from 'hooks/useBalance'
import { minterRoleId } from '@components/SpaceSettingsPanel/rolePermissions.const'
import { ReviewStars } from '@components/ReviewStars/ReviewStars'
import { useReviews } from 'hooks/useReviews'
import { env } from 'utils/environment'
import { useDevice } from 'hooks/useDevice'
import { useIsSpaceCurrentlyFree } from '@components/SpaceSettingsPanel/hooks'

interface ExploreCardProps {
    address: string
    variant: 'big' | 'small'
}

export const ExploreCard = ({ address, variant }: ExploreCardProps) => {
    const navigate = useNavigate()
    const spaceId = SpaceIdFromSpaceAddress(address)

    const { data: spaceInfo, isLoading: isSpaceInfoLoading } =
        useContractSpaceInfoWithoutClient(spaceId)
    const { data: memberInfo } = useReadableMembershipInfo(spaceId ?? '')
    const { data: entitlements } = useEntitlements(spaceId ?? '', minterRoleId)
    const membership = useMyMembership(spaceId)
    const { averageRating, totalReviews } = useReviews(spaceId ?? '')
    const { isTouch } = useDevice()
    const isSpaceFree = useIsSpaceCurrentlyFree({ spaceId })

    const price = useMemo(() => {
        if (!memberInfo) {
            return undefined
        }

        if (isSpaceFree && memberInfo.price === 'Free') {
            return 'Free'
        }

        return `${formatUnitsToFixedLength(parseUnits(memberInfo?.price), 18, 3)} ${
            memberInfo?.currency
        }`
    }, [memberInfo, isSpaceFree])

    const onClick = useCallback(() => {
        Analytics.getInstance().track('clicked town on explore', {
            spaceId,
            featureSize: variant,
        })
        navigate(`/${PATHS.SPACES}/${address}`)
    }, [address, navigate, spaceId, variant])

    const imageVariant = ImageVariants.thumbnail600
    const { imageSrc } = useImageSource(spaceId, imageVariant)

    if (!spaceId || isSpaceInfoLoading) {
        return null
    }

    const isBig = variant === 'big'
    const isReviewsEnabled = env.VITE_REVIEWS_ENABLED

    const MemberCount = () => (
        <Box
            flexDirection="row"
            gap="xxs"
            alignItems="center"
            style={{ marginTop: isTouch ? '0px' : isBig ? '-1px' : '-2px' }}
        >
            <Icon type="people" size={isBig ? 'square_md' : 'square_sm'} color="gray2" />
            <Text color="gray2" size={isBig ? 'md' : 'sm'}>
                {memberInfo?.totalSupply ?? 0}
            </Text>
        </Box>
    )

    const ReviewsInfo = () =>
        isReviewsEnabled && totalReviews > 0 ? (
            <Box flexDirection="row" gap="xs">
                <ReviewStars rating={averageRating} size={isBig ? 20 : 16} color="gray2" />
                <Text
                    color="gray2"
                    size={isBig ? 'md' : 'sm'}
                    style={{ marginTop: isBig ? '5px' : '3px' }}
                >
                    {averageRating.toFixed(1)} ({totalReviews})
                </Text>
            </Box>
        ) : null

    const PriceTag = () =>
        price ? (
            <Pill background="level3" cursor="pointer" paddingY="md" minWidth="100">
                {membership !== Membership.Join ? (
                    <Text color="greenBlue">{entitlements.hasEntitlements ? 'Gated' : price}</Text>
                ) : (
                    <Text color="neutral">Member</Text>
                )}
            </Pill>
        ) : null

    if (variant === 'big') {
        return (
            <Box
                hoverable
                position="relative"
                background="level2"
                borderRadius="lg"
                padding="lg"
                width="100%"
                cursor="pointer"
                overflow="hidden"
                onClick={onClick}
            >
                {imageSrc && (
                    <MotionBox
                        absoluteFill
                        pointerEvents="none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <BlurredBackground imageSrc={imageSrc} blur={40} />
                    </MotionBox>
                )}

                <Box position="relative">
                    <Stack gap="lg">
                        <Box display="flex" flexDirection="row" gap="x4" alignItems="center">
                            <InteractiveSpaceIcon
                                reduceMotion
                                spaceId={spaceId}
                                address={address}
                                size="lg"
                                spaceName={spaceInfo?.name}
                            />

                            <Stack gap="md">
                                <Heading level={2} color="default">
                                    {spaceInfo?.name}
                                </Heading>
                                {spaceInfo?.shortDescription && (
                                    <Paragraph
                                        color="gray2"
                                        size="lg"
                                        style={{
                                            overflow: 'hidden',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 1,
                                            WebkitBoxOrient: 'vertical',
                                            paddingBottom: '4px',
                                        }}
                                    >
                                        {spaceInfo.shortDescription}
                                    </Paragraph>
                                )}
                                <Stack horizontal gap="sm">
                                    <ReviewsInfo />
                                    <MemberCount />
                                </Stack>
                                <PriceTag />
                            </Stack>
                        </Box>
                    </Stack>
                </Box>
            </Box>
        )
    }

    return (
        <Box
            horizontal
            hoverable
            background="level2"
            borderRadius="md"
            padding="sm"
            gap="sm"
            width="100%"
            cursor="pointer"
            onClick={onClick}
        >
            <Box display="flex" flexDirection="row" width="100%" justifyContent="spaceBetween">
                <Box display="flex" flexDirection="row" gap="paragraph">
                    <InteractiveSpaceIcon
                        reduceMotion
                        spaceId={spaceId}
                        address={address}
                        size={isTouch ? 'xxs' : 'xs'}
                        spaceName={spaceInfo?.name}
                    />

                    <Stack gap="sm" paddingY="md">
                        <Stack gap="md">
                            <Heading level={3} color="default" whiteSpace="normal">
                                {spaceInfo?.name}
                            </Heading>

                            {spaceInfo?.shortDescription && (
                                <Paragraph
                                    color="gray2"
                                    style={{
                                        marginBottom: '-6px',
                                        overflow: 'hidden',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 1,
                                        WebkitBoxOrient: 'vertical',
                                        lineHeight: '1.5',
                                        minHeight: '1.5em',
                                    }}
                                >
                                    {spaceInfo?.shortDescription}
                                </Paragraph>
                            )}
                        </Stack>
                        <Stack horizontal={!isTouch} gap="sm">
                            <ReviewsInfo />
                            <MemberCount />
                        </Stack>
                    </Stack>
                </Box>
                <Box alignSelf="center" paddingRight="sm" paddingLeft="sm">
                    <PriceTag />
                </Box>
            </Box>
        </Box>
    )
}
