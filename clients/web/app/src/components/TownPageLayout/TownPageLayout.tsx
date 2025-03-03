import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
    Address,
    useContractSpaceInfo,
    useGetRootKeyFromLinkedWallet,
    useUserLookupStore,
} from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { isAddress } from 'viem'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { Box, Button, Heading, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { AvatarTextHorizontal } from '@components/Avatar/AvatarTextHorizontal'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { baseScanUrl, openSeaAssetUrl } from '@components/Web3/utils'
import { vars } from 'ui/styles/vars.css'
import { ToneName } from 'ui/styles/themes'
import { getInviteUrl } from 'ui/utils/utils'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { useSpacePageChannels } from './hooks/useSpacePageChannels'
import { TownReviewsSection } from './TownReviewsSection'
import { TownInfoSection } from './TownInfoSection'

type TownPageLayoutProps = {
    headerContent?: React.ReactNode
    activityContent?: React.ReactNode
    bottomContent?: ({
        leftColWidth,
        rightColWidth,
    }: {
        leftColWidth: number
        rightColWidth: number
    }) => React.ReactNode
    isPreview: boolean
    spaceId: string
    spaceInfo: NonNullable<ReturnType<typeof useContractSpaceInfo>['data']>
}

export const TownPageLayout = (props: TownPageLayoutProps) => {
    const { spaceId, isPreview, spaceInfo } = props
    const address = isAddress(spaceInfo.address) ? spaceInfo.address : undefined
    const owner = isAddress(spaceInfo.owner) ? spaceInfo.owner : undefined
    const name = spaceInfo.name

    const { baseChain } = useEnvironment()
    const chainId = baseChain.id
    const { data: userId } = useGetRootKeyFromLinkedWallet({ walletAddress: owner })
    const [copiedLink, setCopiedLink] = useState(false)
    const [, copy] = useCopyToClipboard()
    const bio = spaceInfo?.longDescription
    const motto = spaceInfo?.shortDescription

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

    const { imageSrc } = useImageSource(spaceId, ImageVariants.thumbnail600)
    const leftColRef = useRef<HTMLDivElement>(null)
    const rightColRef = useRef<HTMLDivElement>(null)
    const [leftColWidth, rightColWidth] = useColumnWidths({ leftColRef, rightColRef })

    return (
        <>
            <Stack
                scroll
                alignItems="center"
                height="100dvh"
                paddingTop="safeAreaInsetTop"
                paddingX="md"
            >
                {props.headerContent}
                <Stack
                    justifyContent={{
                        desktop: 'spaceBetween',
                        tablet: 'end',
                    }}
                    flexDirection={{
                        desktop: 'row',
                        tablet: 'columnReverse',
                    }}
                    paddingBottom="x4"
                    width="100%"
                    style={{ maxWidth: isTouch ? '100%' : '1050px' }}
                    pointerEvents="all"
                    height="100%"
                    gap={{
                        desktop: 'x20',
                        tablet: 'md',
                    }}
                    paddingTop="x4"
                >
                    <Stack gap="x4" ref={leftColRef}>
                        <Stack horizontal gap="sm" alignContent="start">
                            {isTouch && (
                                <InteractiveTownsToken
                                    spaceId={spaceId}
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
                                address={address}
                                chainId={chainId}
                            />
                        </Stack>
                        <TownInfoSection spaceId={spaceId} />
                        <Bio bio={bio} />
                        <ChannelList spaceId={spaceId} />
                        <TownReviewsSection spaceId={spaceId} />
                        <Box height="x12" shrink={false} />
                    </Stack>
                    {/* right column */}
                    {!isTouch && (
                        <Stack gap="lg" alignItems="center" ref={rightColRef}>
                            <Box height="x2" shrink={false} />
                            <InteractiveTownsToken
                                key={imageSrc}
                                spaceId={spaceId}
                                size="xl"
                                address={address}
                                imageSrc={imageSrc ?? undefined}
                                spaceName={name}
                            />

                            <Box tooltip="Copy link">
                                <Button
                                    size="button_md"
                                    width="300"
                                    tone="lightHover"
                                    color="default"
                                    data-testid="town-preview-share-link-button"
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
                        </Stack>
                    )}
                </Stack>
                {!isPreview &&
                    props.bottomContent &&
                    props.bottomContent({
                        leftColWidth,
                        rightColWidth,
                    })}
            </Stack>
        </>
    )
}

function useColumnWidths({
    leftColRef,
    rightColRef,
}: {
    leftColRef: React.RefObject<HTMLDivElement>
    rightColRef: React.RefObject<HTMLDivElement>
}) {
    const [widths, setWidths] = useState<[number, number]>([0, 0])
    const observer = useMemo(
        () =>
            new ResizeObserver(() => {
                setWidths((s) => [
                    leftColRef.current?.getBoundingClientRect().width ?? s[0],
                    rightColRef.current?.getBoundingClientRect().width ?? s[1],
                ])
            }),
        [leftColRef, rightColRef],
    )
    useLayoutEffect(() => {
        if (leftColRef.current) {
            observer.observe(leftColRef.current)
        }
        if (rightColRef.current) {
            observer.observe(rightColRef.current)
        }
        return () => {
            observer.disconnect()
        }
    }, [leftColRef, observer, rightColRef])

    return widths
}

type User = {
    ensName?: string
}

const Header = (props: {
    spaceId?: string
    name?: string
    owner?: string
    userId?: string
    motto?: string
    isPreview: boolean
    address?: `0x${string}`
    chainId?: number
}) => {
    const { name, owner, userId, motto, spaceId, isPreview, address, chainId } = props
    const { isTouch } = useDevice()
    const { lookupUser } = useUserLookupStore(
        (state: { lookupUser: (userId: Address) => User | undefined }) => ({
            lookupUser: state.lookupUser,
        }),
    )

    const ownerUser = useMemo(() => {
        if (!userId) {
            return undefined
        }
        return lookupUser(userId as Address)
    }, [userId, lookupUser])

    const onTouchSharePressed = useEvent(async () => {
        if (!spaceId) {
            return
        }
        const url = getInviteUrl({ spaceId })
        try {
            await navigator.share({ title: name, url: url })
        } catch (_) {} // eslint-disable-line no-empty
    })

    const onAddressClick = useEvent(() => {
        if (!address || !chainId) {
            return
        }
        window.open(`${baseScanUrl(chainId)}/address/${address}`, '_blank', 'noopener,noreferrer')
    })

    const onOpenSeaClick = useEvent(() => {
        if (!address || !chainId) {
            return
        }
        window.open(`${openSeaAssetUrl(chainId, address)}`, '_blank', 'noopener,noreferrer')
    })

    return (
        <Stack horizontal width="100%">
            <Stack
                justifyContent={{
                    mobile: 'center',
                }}
                gap={{
                    desktop: 'md',
                    mobile: motto ? 'sm' : 'md',
                }}
                paddingTop={isTouch ? 'sm' : 'none'}
            >
                <Stack gap>
                    <Box display="flex" flexDirection="row" alignItems="center">
                        <Heading
                            data-testid="town-preview-header"
                            level={2}
                            style={{ textTransform: 'none' }}
                        >
                            {name}
                        </Heading>
                        {address && chainId && (
                            <Box
                                display="flex"
                                flexDirection="row"
                                gap="sm"
                                alignItems="center"
                                paddingLeft="sm"
                                marginTop="xs"
                            >
                                <IconButton
                                    color="gray2"
                                    hoverColor="default"
                                    icon="etherscan"
                                    size="square_md"
                                    onClick={onAddressClick}
                                />
                                <IconButton
                                    color="gray2"
                                    hoverColor="default"
                                    icon="openSeaPlain"
                                    size="square_md"
                                    onClick={onOpenSeaClick}
                                />
                            </Box>
                        )}
                    </Box>
                    {motto && <Text color="gray2">{motto}</Text>}
                </Stack>
                <Stack horizontal justifySelf="end" height="x4">
                    {userId && (
                        <AvatarTextHorizontal
                            userId={userId}
                            abstractAccountaddress={owner as Address}
                            prepend={<Text color="gray2">By </Text>}
                            customDisplayName={ownerUser?.ensName}
                        />
                    )}
                </Stack>
            </Stack>

            {isTouch && !isPreview && (
                <Box grow justifyContent="end" alignItems="end">
                    <Box width="x4" height="x4" rounded="sm">
                        <IconButton
                            centerContent
                            icon="share"
                            background="lightHover"
                            color="default"
                            aspectRatio="1/1"
                            onClick={onTouchSharePressed}
                        />
                    </Box>
                </Box>
            )}
        </Stack>
    )
}

const ChannelList = ({ spaceId }: { spaceId: string }) => {
    const { channels, channelCount, isLoading: isChannelsLoading } = useSpacePageChannels(spaceId)
    const MAX_VISIBLE_CHANNELS = 8

    const visibleChannels = channels.slice(0, MAX_VISIBLE_CHANNELS)
    const remainingCount = channels.length - MAX_VISIBLE_CHANNELS

    if (channels.length === 0 || isChannelsLoading) {
        return null
    }

    return (
        <Stack gap="md" maxWidth="500">
            <Text strong size="md">
                {channelCount} Channel{channelCount === 1 ? '' : 's'}
            </Text>
            <Stack horizontal flexWrap="wrap" gap="sm">
                {visibleChannels.map((channel) => (
                    <Box
                        key={channel.channelNetworkId}
                        background="level3"
                        paddingX="sm"
                        paddingY="sm"
                        borderRadius="sm"
                    >
                        <Text color="gray1">#{channel.name}</Text>
                    </Box>
                ))}
                {remainingCount > 0 && (
                    <Box
                        key={`remaining-${remainingCount}`}
                        background="level3"
                        paddingX="sm"
                        paddingY="sm"
                        borderRadius="sm"
                    >
                        <Text color="gray1">+{remainingCount} more</Text>
                    </Box>
                )}
            </Stack>
        </Stack>
    )
}

const BIO_MAX_LENGTH = 100
const Bio = (props: { bio?: string }) => {
    const { bio = '' } = props
    const { isTouch } = useDevice()
    const [isExpanded, setIsExpanded] = useState<boolean>(false)
    const shortenedBio = useMemo(() => {
        if (isExpanded) {
            return bio
        }

        return bio.slice(0, BIO_MAX_LENGTH) + '…'
    }, [bio, isExpanded])

    const canExpand = bio && bio.length > BIO_MAX_LENGTH && !isExpanded

    return bio ? (
        <Stack gap="md">
            <Text strong size="md">
                About
            </Text>
            <Box display="inline-block" style={{ maxWidth: isTouch ? '100%' : '55ch' }}>
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
        </Stack>
    ) : (
        <></>
    )
}
