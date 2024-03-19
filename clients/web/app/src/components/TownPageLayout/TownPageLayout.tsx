import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Address, useGetRootKeyFromLinkedWallet } from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import {
    Box,
    BoxProps,
    Button,
    Heading,
    Icon,
    IconButton,
    MotionStack,
    Paragraph,
    Stack,
    Text,
} from '@ui'
import { useDevice } from 'hooks/useDevice'
import { AvatarTextHorizontal } from '@components/Avatar/AvatarTextHorizontal'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { baseScanUrl, openSeaAssetUrl } from '@components/Web3/utils'
import { vars } from 'ui/styles/vars.css'
import { ToneName } from 'ui/styles/themes'
import { getInviteUrl } from 'ui/utils/utils'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { useReadableMembershipInfo } from './useReadableMembershipInfo'
import { durationTitleSubtitle } from './townPageUtils'

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
}

export const TownPageLayout = (props: TownPageLayoutProps) => {
    const { address, bio, name, spaceId, owner, isPreview } = props
    const { chainId } = useEnvironment()
    const { data: userId } = useGetRootKeyFromLinkedWallet({ walletAddress: owner, chainId })
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

    const isTokensGatingMembershipLoading = false // TODO get from join role data

    const anyoneCanJoin = true // TODO get from join role data

    const { imageSrc } = useImageSource(spaceId, ImageVariants.thumbnail600)

    // const tokens = [
    //     {
    //         contractAddress: '0x123',
    //         tokenIds: [1, 2],
    //     },
    // ] // TODO get from join role data

    return (
        <>
            <Stack alignItems="center" height="100dvh">
                {props.headerContent}
                <Stack width="100%" alignItems="center" height="100%">
                    <Stack
                        horizontal={!isTouch}
                        paddingX="lg"
                        paddingBottom="x4"
                        width="100%"
                        maxWidth={isTouch ? '100%' : '1000'}
                        pointerEvents="all"
                        gap="md"
                        height="100%"
                    >
                        <Stack scroll gap="lg" width="100%" paddingTop="x8">
                            <Stack horizontal gap="sm" alignContent="start" paddingTop="x4">
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
                                tokens={[]}
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
    isPreview: boolean
}) => {
    const { name, owner, userId, spaceId, isPreview } = props
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
        <Stack gap="lg" width="100%" paddingTop={isTouch ? 'sm' : 'none'}>
            <Heading level={2} style={{ textTransform: 'none' }}>
                {name}
            </Heading>
            {/* <Box grow /> */}
            <Stack horizontal>
                {userId && (
                    <AvatarTextHorizontal
                        userId={userId}
                        abstractAccountaddress={owner as Address}
                        prepend={<Text color="gray1">By </Text>}
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
    tokens?: { contractAddress: string; tokenIds: number[] }[]
}) => {
    const { price, address, chainId, duration } = props
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

    return (
        <MotionStack
            horizontal
            gap="sm"
            height="x12"
            minHeight="x12"
            alignItems="center"
            shrink={false}
        >
            {price && (
                <InformationBox
                    key="cost"
                    title="Cost"
                    centerContent={
                        <Text style={{ fontSize: '24px' }} fontWeight="strong">
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
                        <Text style={{ fontSize: '24px' }} fontWeight="strong">
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

export const InformationBox = (props: {
    title: string
    centerContent: React.ReactNode
    subtitle: string
    border?: BoxProps['border']
    onClick?: () => void
}) => {
    const [isHovered, setIsHovered] = useState(false)
    const onPointerEnter = useEvent(() => {
        setIsHovered(true)
    })
    const onPointerLeave = useEvent(() => {
        setIsHovered(false)
    })
    return (
        <MotionStack
            centerContent
            rounded="md"
            height="x12"
            width="x12"
            shrink={false}
            background={isHovered ? 'hover' : 'lightHover'}
            cursor={props.onClick ? 'pointer' : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            layout="position"
            border={props.border}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onClick={props.onClick}
        >
            <Box centerContent height="x4">
                <Text size="sm" color="gray2">
                    {props.title}
                </Text>
            </Box>
            <Box centerContent height="x3" width="100%">
                {props.centerContent}
            </Box>
            <Box centerContent height="x4">
                <Text size="sm" color="gray2">
                    {props.subtitle}
                </Text>
            </Box>
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
