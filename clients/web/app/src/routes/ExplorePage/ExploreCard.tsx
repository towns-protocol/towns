import React, { useCallback } from 'react'
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

    const MemberCount = () =>
        (memberInfo?.totalSupply ?? 0) > 1 ? (
            <Box display="flex" flexDirection="row" gap="sm" color="gray2" alignItems="center">
                <Icon type="people" size="square_sm" />
                <Paragraph size={isBig ? 'md' : 'sm'}>{memberInfo?.totalSupply}</Paragraph>
            </Box>
        ) : null
    const PriceTag = () =>
        memberInfo?.price ? (
            <Pill
                background="level3"
                position="relative"
                alignSelf="start"
                cursor="pointer"
                paddingY="md"
                minWidth="100"
            >
                {membership !== Membership.Join ? (
                    <Text color="greenBlue">
                        {entitlements.hasEntitlements
                            ? 'Gated'
                            : memberInfo?.price !== 'Free'
                            ? `${formatUnitsToFixedLength(parseUnits(memberInfo?.price), 18, 3)} ${
                                  memberInfo?.currency
                              }`
                            : 'Free'}
                    </Text>
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
                                <MemberCount />
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
                        size="xs"
                        spaceName={spaceInfo?.name}
                    />

                    <Stack gap="sm" paddingY="md">
                        <Heading level={3} color="default" whiteSpace="normal">
                            {spaceInfo?.name}
                        </Heading>
                        {spaceInfo?.shortDescription && (
                            <Paragraph
                                color="gray2"
                                style={{
                                    marginTop: '8px',
                                    marginRight: '4px',
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                }}
                            >
                                {spaceInfo?.shortDescription}
                            </Paragraph>
                        )}
                        <MemberCount />
                    </Stack>
                </Box>
                <Box alignSelf="center" paddingRight="sm">
                    <PriceTag />
                </Box>
            </Box>
        </Box>
    )
}
