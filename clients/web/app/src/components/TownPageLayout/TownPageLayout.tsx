import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
    Address,
    EVERYONE_ADDRESS,
    useContractSpaceInfo,
    useGetRootKeyFromLinkedWallet,
} from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { isAddress } from 'viem'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { Box, Button, Heading, Icon, IconButton, MotionStack, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { AvatarTextHorizontal } from '@components/Avatar/AvatarTextHorizontal'
import { useConvertEntitlementsToTokenWithBigInt } from '@components/Tokens/hooks'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { baseScanUrl, openSeaAssetUrl } from '@components/Web3/utils'
import { vars } from 'ui/styles/vars.css'
import { ToneName } from 'ui/styles/themes'
import { getInviteUrl } from 'ui/utils/utils'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { Entitlements, checkAnyoneCanJoin, useEntitlements } from 'hooks/useEntitlements'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useTokensWithMetadata } from 'api/lib/collectionMetadata'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useReadableMembershipInfo } from './useReadableMembershipInfo'
import { TokenInfoBox } from './TokenInfoBox'
import { InformationBox } from './InformationBox'
import { getDurationText, getPriceText } from './townPageUtils'

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
    const bio = spaceInfo?.shortDescription
    const motto = spaceInfo?.longDescription

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

    const { data: entitlements, isLoading: isEntitlementsLoading } = useEntitlements(spaceId)

    const anyoneCanJoin = checkAnyoneCanJoin(entitlements)

    const { imageSrc } = useImageSource(spaceId, ImageVariants.thumbnail600)
    const leftColRef = useRef<HTMLDivElement>(null)
    const rightColRef = useRef<HTMLDivElement>(null)
    const [leftColWidth, rightColWidth] = useColumnWidths({ leftColRef, rightColRef })
    const isJoining = !!usePublicPageLoginFlow().spaceBeingJoined

    const priceText = useMemo(
        () => getPriceText(membershipInfo?.price, membershipInfo?.remainingFreeSupply),
        [membershipInfo?.price, membershipInfo?.remainingFreeSupply],
    )

    const durationText = useMemo(
        () => getDurationText(membershipInfo?.duration),
        [membershipInfo?.duration],
    )

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
                        desktop: 'center',
                        tablet: 'end',
                    }}
                    flexDirection={{
                        desktop: 'row',
                        tablet: 'columnReverse',
                    }}
                    paddingBottom="x4"
                    width="100%"
                    maxWidth={isTouch ? '100%' : undefined}
                    pointerEvents="all"
                    height="100%"
                    gap={{
                        desktop: 'x20',
                        tablet: 'md',
                    }}
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
                            />
                        </Stack>
                        {!isJoining && (
                            <InformationBoxes
                                imageSrc={imageSrc}
                                price={priceText}
                                duration={durationText}
                                address={address}
                                chainId={chainId}
                                anyoneCanJoin={anyoneCanJoin}
                                isEntitlementsLoading={isEntitlementsLoading}
                                entitlements={entitlements}
                            />
                        )}
                        <Bio bio={bio} />

                        <Box>{props.activityContent}</Box>
                        <Box height="x12" shrink={false} />
                    </Stack>
                    {/* right column */}
                    {!isTouch && (
                        <Stack gap="lg" alignItems="center" paddingTop="x8" ref={rightColRef}>
                            <Box height="x2" shrink={false} />
                            <InteractiveTownsToken
                                key={imageSrc}
                                spaceId={spaceId}
                                size="xl"
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
                            )}
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
        <Stack gap width="100%" justifyContent="spaceBetween" paddingTop={isTouch ? 'sm' : 'none'}>
            <Stack gap>
                <Heading
                    level={2}
                    style={{ textTransform: 'none' }}
                    data-testid="town-preview-header"
                >
                    {name}
                </Heading>
                {motto && <Text color="gray2">{motto}</Text>}
            </Stack>
            <Stack horizontal justifySelf="end" height="x4">
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
    price: { value: string; suffix: string } | undefined
    duration: { value: string; suffix: string } | undefined
    address?: `0x${string}`
    chainId: number
    anyoneCanJoin: boolean
    isEntitlementsLoading: boolean
    entitlements?: Entitlements
}) => {
    const {
        address,
        anyoneCanJoin,
        chainId,
        duration,
        isEntitlementsLoading,
        price,
        entitlements,
    } = props
    const { isTouch } = useDevice()
    const onAddressClick = useEvent(() => {
        window.open(`${baseScanUrl(chainId)}/address/${address}`, '_blank', 'noopener,noreferrer')
    })

    const onOpenSeaClick = useEvent(() => {
        if (!address) {
            return
        }
        window.open(`${openSeaAssetUrl(chainId, address)}`, '_blank', 'noopener,noreferrer')
    })

    const tokens = useConvertEntitlementsToTokenWithBigInt(entitlements)
    const { data: tokensGatedBy, isLoading: isLoadingTokensData } = useTokensWithMetadata(tokens)

    const usersGatedBy = entitlements?.users.filter((user) => user !== EVERYONE_ADDRESS) ?? []

    if (isLoadingTokensData) {
        return <ButtonSpinner />
    }

    return (
        <MotionStack
            horizontal
            gap="sm"
            height="x12"
            minHeight="x12"
            alignItems="center"
            overflowX="scroll"
            scrollbars={false}
            shrink={false}
            layout="position"
            style={{
                paddingLeft: isTouch ? vars.space['lg'] : 'none',
                marginLeft: isTouch ? vars.space['-lg'] : 'none',
                marginRight: isTouch ? vars.space['-lg'] : 'none',
            }}
        >
            <TokenInfoBox
                title="Access"
                subtitle={anyoneCanJoin ? 'Open' : 'Gated'}
                isEntitlementsLoading={isEntitlementsLoading}
                tokensGatedBy={tokensGatedBy}
                usersGatedBy={usersGatedBy}
                dataTestId="town-preview-membership-info-bubble"
            />
            <InformationBox
                key="cost"
                title="Entry"
                placeholder={!price}
                centerContent={
                    <Text size="lg" fontWeight="strong">
                        {price?.value}
                    </Text>
                }
                subtitle={price?.suffix}
                dataTestId="town-preview-cost-info-bubble"
            />
            <InformationBox
                key="duration"
                title="Valid for"
                placeholder={!duration}
                centerContent={
                    <Text size="lg" fontWeight="strong">
                        {duration?.value}
                    </Text>
                }
                subtitle={duration?.suffix}
                dataTestId="town-preview-valid-for-info-bubble"
                onClick={onAddressClick}
            />
            {address && (
                <InformationBox
                    key="explore"
                    title="Explore"
                    centerContent={<Icon type="etherscan" />}
                    subtitle="Etherscan"
                    dataTestId="town-preview-etherscan-info-bubble"
                    onClick={onAddressClick}
                />
            )}
            {address && (
                <InformationBox
                    key="opensea"
                    title="View"
                    centerContent={<Icon type="openSeaPlain" />}
                    subtitle="OpenSea"
                    dataTestId="town-preview-opeansea-info-bubble"
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
    ) : (
        <></>
    )
}
