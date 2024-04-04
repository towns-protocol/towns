import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Address, useGetRootKeyFromLinkedWallet } from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { Box, Button, Heading, Icon, IconButton, MotionStack, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { AvatarTextHorizontal } from '@components/Avatar/AvatarTextHorizontal'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { baseScanUrl, openSeaAssetUrl } from '@components/Web3/utils'
import { vars } from 'ui/styles/vars.css'
import { ToneName } from 'ui/styles/themes'
import { getInviteUrl } from 'ui/utils/utils'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import {
    TokenGatingMembership,
    checkAnyoneCanJoin,
    useTokensGatingMembership,
} from 'hooks/useTokensGatingMembership'
import { useReadableMembershipInfo } from './useReadableMembershipInfo'
import { durationTitleSubtitle } from './townPageUtils'
import { TokenInfoBox } from './TokenInfoBox'
import { InformationBox } from './InformationBox'

type TownPageLayoutProps = {
    headerContent?: React.ReactNode
    activityContent?: React.ReactNode
    bottomContent?: React.ReactNode
    isPreview: boolean
    spaceId: string
    address?: `0x${string}`
    name?: string
    owner?: `0x${string}`
    bio?: string
    motto?: string
}

export const TownPageLayout = (props: TownPageLayoutProps) => {
    const { address, bio, motto, name, spaceId, owner, isPreview } = props
    const { baseChain } = useEnvironment()
    const chainId = baseChain.id
    const { data: userId } = useGetRootKeyFromLinkedWallet({ walletAddress: owner })
    const [copiedLink, setCopiedLink] = useState(false)
    const [, copy] = useCopyToClipboard()

    useEffect(() => {
        if (copiedLink) {
            const timeout = setTimeout(() => {
                setCopiedLink(false)
            }, 1000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [copiedLink])

    const onCopyInviteLink = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()

            const inviteUrl = getInviteUrl({ spaceId })
            const asyncCopy = async () => {
                const copied = await copy(inviteUrl)
                setCopiedLink(copied)
            }
            asyncCopy()
        },
        [spaceId, copy],
    )

    const { isTouch } = useDevice()

    const { data: membershipInfo } = useReadableMembershipInfo(spaceId)

    const { data: tokensGatingMembership, isLoading: isTokensGatingMembershipLoading } =
        useTokensGatingMembership(spaceId)

    const anyoneCanJoin = checkAnyoneCanJoin(tokensGatingMembership)

    const { imageSrc } = useImageSource(spaceId, ImageVariants.thumbnail600)

    return (
        <>
            <Stack scroll alignItems="center" height="100dvh" paddingTop="safeAreaInsetTop">
                {props.headerContent}
                <Stack width="100%" alignItems="center" height="100%">
                    <Stack
                        horizontal={!isTouch}
                        paddingX="md"
                        paddingBottom="x4"
                        width="100%"
                        maxWidth={isTouch ? '100%' : '1000'}
                        pointerEvents="all"
                        gap="md"
                        height="100%"
                    >
                        <Stack gap="lg" width="100%">
                            <Stack horizontal gap="sm" alignContent="start">
                                {isTouch && (
                                    <InteractiveTownsToken
                                        key={imageSrc}
                                        size="sm"
                                        address={address}
                                        imageSrc={imageSrc ?? undefined}
                                        spaceName={name}
                                    />
                                )}
                                <Header
                                    name={name}
                                    owner={owner}
                                    userId={userId}
                                    spaceId={spaceId}
                                    isPreview={isPreview}
                                    motto={motto}
                                />
                            </Stack>
                            <InformationBoxes
                                imageSrc={imageSrc}
                                price={membershipInfo?.price}
                                duration={membershipInfo?.duration}
                                address={address}
                                chainId={chainId}
                                anyoneCanJoin={anyoneCanJoin}
                                isTokensGatingMembershipLoading={isTokensGatingMembershipLoading}
                                tokensGatingMembership={tokensGatingMembership}
                            />
                            <Bio bio={bio} />

                            <Box>{props.activityContent}</Box>
                            <Box height="x12" shrink={false} />
                        </Stack>
                        {/* right column */}
                        {!isTouch && (
                            <Stack gap="lg" alignItems="center" paddingTop="x8">
                                <Box height="x2" shrink={false} />
                                <InteractiveTownsToken
                                    key={imageSrc}
                                    size={isTouch ? 'lg' : 'xl'}
                                    address={address}
                                    imageSrc={imageSrc ?? undefined}
                                    spaceName={name}
                                />

                                {!isPreview && (
                                    <Box tooltip="Copy link">
                                        <Button
                                            size="button_md"
                                            width="300"
                                            tone="lightHover"
                                            color="default"
                                            onClick={onCopyInviteLink}
                                        >
                                            {copiedLink ? (
                                                'Link copied'
                                            ) : (
                                                <>
                                                    <Icon type="share" />
                                                    Share Link
                                                </>
                                            )}
                                        </Button>
                                    </Box>
                                )}
                            </Stack>
                        )}
                    </Stack>
                </Stack>
                {!isPreview && <>{props.bottomContent && props.bottomContent}</>}
            </Stack>
        </>
    )
}

const Header = (props: {
    spaceId?: string
    name?: string
    owner?: string
    userId?: string
    motto?: string
    isPreview: boolean
}) => {
    const { name, owner, userId, motto, spaceId, isPreview } = props
    const { isTouch } = useDevice()

    const onTouchSharePressed = useEvent(async () => {
        if (!spaceId) {
            return
        }
        const url = getInviteUrl({ spaceId })
        try {
            await navigator.share({ title: name, url: url })
        } catch (_) {} // eslint-disable-line no-empty
    })

    return (
        <Stack gap width="100%" paddingTop={isTouch ? 'sm' : 'none'}>
            <Heading level={2} style={{ textTransform: 'none' }}>
                {name}
            </Heading>
            {motto && <Text color="gray2">{motto}</Text>}
            <Stack horizontal>
                {userId && (
                    <AvatarTextHorizontal
                        userId={userId}
                        abstractAccountaddress={owner as Address}
                        prepend={<Text color="gray2">By </Text>}
                    />
                )}
                {isTouch && !isPreview && (
                    <>
                        <Box grow />
                        <IconButton
                            centerContent
                            icon="share"
                            background="lightHover"
                            color="default"
                            aspectRatio="1/1"
                            onClick={onTouchSharePressed}
                        />
                    </>
                )}
            </Stack>
        </Stack>
    )
}

const InformationBoxes = (props: {
    imageSrc?: string
    price?: string | number
    duration?: number
    address?: `0x${string}`
    chainId: number
    anyoneCanJoin: boolean
    isTokensGatingMembershipLoading: boolean
    tokensGatingMembership?: TokenGatingMembership
}) => {
    const { price, address, chainId, duration, anyoneCanJoin, tokensGatingMembership } = props
    const onAddressClick = useEvent(() => {
        window.open(`${baseScanUrl(chainId)}/address/${address}`, '_blank', 'noopener,noreferrer')
    })

    const onOpenSeaClick = useEvent(() => {
        if (!address) {
            return
        }
        window.open(`${openSeaAssetUrl(chainId, address)}`, '_blank', 'noopener,noreferrer')
    })

    const durationTexts = useMemo(() => durationTitleSubtitle(duration), [duration])
    const _tokens = useMemo(() => tokensGatingMembership?.tokens ?? [], [tokensGatingMembership])

    return (
        <MotionStack
            horizontal
            gap="sm"
            height="x12"
            minHeight="x12"
            alignItems="center"
            shrink={false}
        >
            <TokenInfoBox
                title="For"
                subtitle={anyoneCanJoin ? 'Anyone' : 'Holders'}
                anyoneCanJoin={anyoneCanJoin}
                tokensGatingMembership={_tokens}
            />

            {price && (
                <InformationBox
                    key="cost"
                    title="Cost"
                    centerContent={
                        <Text size="lg" fontWeight="strong">
                            {price}
                        </Text>
                    }
                    subtitle="ETH"
                />
            )}

            {durationTexts && (
                <InformationBox
                    key="duration"
                    title="Valid for"
                    centerContent={
                        <Text size="lg" fontWeight="strong">
                            {durationTexts.title}
                        </Text>
                    }
                    subtitle={durationTexts.subtitle}
                    onClick={onAddressClick}
                />
            )}

            {address && (
                <InformationBox
                    key="explore"
                    title="Explore"
                    centerContent={<Icon type="etherscan" />}
                    subtitle="Etherscan"
                    onClick={onAddressClick}
                />
            )}

            {address && (
                <InformationBox
                    key="opensea"
                    title="View"
                    centerContent={<Icon type="openSeaPlain" />}
                    subtitle="OpenSea"
                    onClick={onOpenSeaClick}
                />
            )}
            <Box width="x2" shrink={false} />
        </MotionStack>
    )
}

const MAX_LENGTH = 100
const Bio = (props: { bio?: string }) => {
    const { bio = '' } = props
    const { isTouch } = useDevice()
    const [isExpanded, setIsExpanded] = useState<boolean>(false)
    const shortenedBio = useMemo(() => {
        if (isExpanded) {
            return bio
        }

        return bio.slice(0, MAX_LENGTH) + '…'
    }, [bio, isExpanded])

    const canExpand = bio && bio.length > MAX_LENGTH && !isExpanded

    return bio ? (
        <Box maxWidth={isTouch ? '100%' : '75%'}>
            <Paragraph size="lg">
                {shortenedBio}
                {canExpand && (
                    <span
                        style={{ color: vars.color.tone[ToneName.Accent], cursor: 'pointer' }}
                        onClick={() => setIsExpanded(true)}
                    >
                        {' '}
                        more
                    </span>
                )}
            </Paragraph>
        </Box>
    ) : (
        <></>
    )
}
