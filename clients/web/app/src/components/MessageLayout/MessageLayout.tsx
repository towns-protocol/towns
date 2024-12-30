import { format, formatDistance } from 'date-fns'
import React, { MouseEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import {
    Address,
    LookupUser,
    MessageReactions,
    MessageTips,
    Permission,
    ThreadStats,
    useConnectivity,
    useHasPermission,
    useMyUserId,
    useUserLookup,
} from 'use-towns-client'
import { Link } from 'react-router-dom'
import debug from 'debug'
import { Pin } from '@river-build/sdk'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { Reactions } from '@components/Reactions/Reactions'
import { RepliesButton } from '@components/Replies/MessageReplies'
import { Box, BoxProps, ButtonText, Icon, Paragraph, Stack, Text } from '@ui'
import { useHover } from 'hooks/useHover'
import { useHandleReaction } from 'hooks/useReactions'
import { AvatarProps, AvatarWithoutDot } from '@components/Avatar/Avatar'
import { AvatarAtoms } from 'components/Avatar/Avatar.css'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { useFocused } from 'hooks/useFocused'
import { ZRoomMessageRedactedEvent } from '@components/MessageTimeline/util/getEventsByDate'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { useResolveNft } from 'hooks/useNfts'
import { env } from 'utils'
import { MessageContextMenu } from './MessageContextMenu'
import { MessageModalSheet } from './MessageModalSheet'
import { SendStatus, SendStatusIndicator } from './SendStatusIndicator'
import { DecryptionDebugger } from './DecryptionDebugger'
import { TipReaction } from './tips/TipReaction'

type Props = {
    userId?: string | null
    senderId?: string
    avatarSize?: AvatarAtoms['size']
    user?: LookupUser
    displayContext?: 'single' | 'head' | 'body' | 'tail'
    messageSourceAnnotation?: string
    messageBody?: string
    reactions?: MessageReactions
    replies?: ThreadStats
    canReply?: boolean
    timestamp?: number
    editing?: boolean
    editable?: boolean
    eventId?: string
    latestEventId?: string
    threadParentId?: string
    highlight?: boolean
    selectable?: boolean
    listView?: boolean
    channelId?: string
    spaceId?: string
    children?: React.ReactNode
    onReaction?: ReturnType<typeof useHandleReaction>
    relativeDate?: boolean
    rounded?: BoxProps['rounded']
    padding?: BoxProps['padding']
    background?: BoxProps['background']
    channelLabel?: string
    isChannelWritable?: boolean
    isChannelReactable?: boolean
    sendStatus?: SendStatus
    sessionId?: string
    pin?: Pin
    canPin?: boolean
    tips?: MessageTips
} & BoxProps

export type MessageLayoutProps = Props

export const MessageLayout = (props: Props) => {
    const {
        userId,
        senderId,
        threadParentId,
        eventId,
        latestEventId,
        avatarSize = 'avatar_md',
        user,
        messageBody,
        messageSourceAnnotation,
        channelId,
        spaceId,
        editable: isEditable,
        editing: isEditing,
        highlight: isHighlight,
        isChannelWritable = true,
        isChannelReactable,

        selectable: isSelectable,
        listView: isListView,
        displayContext = 'single',
        onReaction,
        reactions,
        relativeDate: isRelativeDate,
        replies,
        canPin,
        canReply,
        sendStatus,
        timestamp,
        children,
        sessionId,
        pin,
        tips,
        ...boxProps
    } = props

    const { loggedInWalletAddress } = useConnectivity()

    const { hasPermission: canRedact } = useHasPermission({
        spaceId: spaceId ?? '',
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.Redact,
        channelId,
    })

    const ref = useRef<HTMLDivElement>(null)
    const { isTouch } = useDevice()

    const { isHover, onMouseEnter } = useHover(ref)
    const { isFocused } = useFocused(ref)

    const [isModalSheetVisible, setIsModalSheetVisible] = useState(false)

    const isActive = isTouch ? isFocused : isHover

    const date = timestamp
        ? isRelativeDate
            ? `${formatDistance(timestamp, Date.now(), {
                  addSuffix: true,
              })}`
            : format(timestamp, 'h:mm a')
        : undefined

    const backgroundProps = useHighlightBackground(isHighlight, !!pin, props.background)

    const onClick: MouseEventHandler = useCallback(
        (e) => {
            // skip context menu when clicking on links or video elements
            if (
                e.target instanceof Element &&
                (e.target.closest('a') || e.target.closest('video'))
            ) {
                return
            }
            setIsModalSheetVisible(true)
        },
        [setIsModalSheetVisible],
    )

    const { createLink } = useCreateLink()
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: senderId as Address | undefined,
    })
    const profileLink = createLink({ profileId: abstractAccountAddress })
    const messageOwner = useUserLookup(senderId ?? '')

    const hasReplies = replies && replies.replyEventIds.size > 0 && eventId
    const numReactions = reactions ? Object.values(reactions).length : 0
    const hasReactions = reactions && numReactions
    const displayButtonsInRow = numReactions < 3 && isTouch

    const debugHash = debug.enabled('app:vlist') ? ` [${eventId?.substring(0, 4)}]` : ''
    const showDecryptionDebugger = debug.enabled('app:decryption')

    return (
        <Stack
            horizontal
            ref={ref}
            background="level1"
            onMouseEnter={onMouseEnter}
            {...boxProps}
            hoverable={isSelectable}
            elevate={(isEditing && !pin) || isHighlight}
            hoverActive={isEditing || isHighlight}
            {...backgroundProps}
            tabIndex={props.tabIndex ?? 0}
        >
            {/* left / avatar gutter */}
            {/* snippet: center avatar with name row by keeping the size of the containers equal  */}
            <Box minWidth={isTouch ? 'x5' : 'x6'}>
                {displayContext === 'single' || displayContext === 'head' ? (
                    senderId ? (
                        <AvatarComponent
                            size={avatarSize}
                            insetTop="2"
                            insetBottom="lg"
                            userId={senderId}
                            link={profileLink}
                            tooltip={isTouch ? undefined : <ProfileHoverCard userId={senderId} />}
                        />
                    ) : (
                        <></>
                    )
                ) : (
                    <>
                        {!isRelativeDate && isActive && (
                            <Box
                                paddingTop="xxs"
                                insetBottom="xxs"
                                display={{ default: 'flex', touch: 'none' }}
                            >
                                <Paragraph truncate size="xs" color="gray2">
                                    {date}
                                    {debugHash}
                                </Paragraph>
                            </Box>
                        )}
                    </>
                )}
            </Box>

            {/* right / main content */}
            <Stack grow gap="paragraph" position="relative">
                {pin ? <PinnedContent pin={pin} /> : <></>}
                {/* name & date top row */}
                {(displayContext === 'head' || displayContext === 'single') && (
                    <Stack horizontal grow gap="xs" height="height_sm" alignItems="center">
                        {/* display name with tooltip */}
                        {senderId && (
                            <Box
                                tooltip={
                                    isTouch ? undefined : <ProfileHoverCard userId={senderId} />
                                }
                            >
                                {profileLink ? (
                                    <Link
                                        to={profileLink ?? ''}
                                        tabIndex={-1}
                                        data-testid="profile-link-button"
                                    >
                                        <UserName user={user} />
                                    </Link>
                                ) : (
                                    <UserName user={user} />
                                )}
                            </Box>
                        )}
                        {props.channelLabel ? (
                            <Text color="gray2">{`#${props.channelLabel}`}</Text>
                        ) : (
                            ``
                        )}

                        {/* date, alignment tbc depending on context */}
                        {date && (
                            <Box height="paragraph" justifyContent="end">
                                <Text
                                    shrink={false}
                                    fontSize={{ desktop: 'xs', mobile: 'xs' }}
                                    color="gray2"
                                    as="span"
                                    textAlign={isListView ? 'right' : 'left'}
                                >
                                    {date}
                                    {debugHash}
                                </Text>
                            </Box>
                        )}
                    </Stack>
                )}
                <Stack gap={{ default: 'paragraph', mobile: 'paragraph' }}>
                    <Stack
                        grow
                        fontSize="md"
                        color="gray1"
                        gap="paragraph"
                        onClick={isTouch && isSelectable ? onClick : undefined}
                    >
                        {children}
                    </Stack>
                    {/* channel */}
                    {messageSourceAnnotation && (
                        <ButtonText color="gray2" as="span">
                            {messageSourceAnnotation}
                        </ButtonText>
                    )}
                    {hasReactions || hasReplies || tips ? (
                        <Stack
                            alignItems={displayButtonsInRow ? 'center' : undefined}
                            flexDirection={displayButtonsInRow ? 'row' : 'columnReverse'}
                            gap={
                                displayButtonsInRow
                                    ? { default: 'md', mobile: 'sm' }
                                    : { default: 'sm', mobile: 'paragraph' }
                            }
                        >
                            {hasReplies && (
                                <RepliesButton eventId={eventId} threadStats={replies} />
                            )}
                            {hasReactions ? (
                                <Reactions
                                    userId={userId}
                                    parentId={eventId}
                                    reactions={reactions}
                                    tipReaction={
                                        env.VITE_TIPS_ENABLED ? (
                                            <TipReaction
                                                isTippable={!isEditable}
                                                tips={tips}
                                                eventId={eventId}
                                                messageOwner={messageOwner}
                                                key={`tip-${eventId}`}
                                            />
                                        ) : (
                                            <></>
                                        )
                                    }
                                    onReaction={onReaction}
                                />
                            ) : tips && env.VITE_TIPS_ENABLED ? (
                                <Box alignSelf="start">
                                    <TipReaction
                                        isTippable={!isEditable}
                                        tips={tips}
                                        eventId={eventId}
                                        messageOwner={messageOwner}
                                    />
                                </Box>
                            ) : null}
                        </Stack>
                    ) : (
                        <></>
                    )}
                    {sendStatus && <SendStatusIndicator status={sendStatus} />}
                </Stack>

                {!isTouch && channelId && eventId && isActive && !isEditing && isSelectable && (
                    <MessageContextMenu
                        canEdit={isEditable}
                        canReact={isChannelReactable}
                        canPin={canPin}
                        canReply={canReply && isChannelWritable}
                        canRedact={canRedact}
                        channelId={channelId}
                        eventId={eventId}
                        latestEventId={latestEventId}
                        isFocused={isFocused}
                        isPinned={!!pin}
                        spaceId={spaceId}
                        threadParentId={threadParentId}
                        messageOwner={messageOwner}
                    />
                )}
            </Stack>
            {isModalSheetVisible && isTouch && channelId && eventId && isSelectable && (
                <MessageModalSheet
                    canPin={canPin}
                    canReply={canReply && isChannelWritable}
                    canReact={isChannelReactable}
                    canRedact={canRedact}
                    channelId={channelId}
                    spaceId={spaceId}
                    eventId={eventId}
                    canEdit={isEditable && isChannelWritable}
                    messageBody={messageBody}
                    threadParentId={threadParentId}
                    isPinned={!!pin}
                    messageOwner={messageOwner}
                    onClose={() => setIsModalSheetVisible(false)}
                />
            )}
            {showDecryptionDebugger && sessionId && eventId && (
                <DecryptionDebugger sessionId={sessionId} eventId={eventId} timestamp={timestamp} />
            )}
        </Stack>
    )
}

const UserName = ({ user }: { user?: LookupUser }) => {
    const name = user ? getPrettyDisplayName(user) : ''

    const resolvedNft = useResolveNft({ walletAddress: user?.userId || '', info: user?.nft })

    return (
        <Stack horizontal gap="xxs" alignItems="center">
            <Text truncate fontWeight="strong" color="default" as="span">
                {name}&nbsp;
            </Text>
            {user?.ensName || resolvedNft ? (
                <Icon type="verifiedEnsName" size="square_sm" color="gray2" />
            ) : (
                <></>
            )}
        </Stack>
    )
}

export const RedactedMessageLayout = (props: {
    event: ZRoomMessageRedactedEvent
    replies?: ThreadStats
}) => {
    const { event, replies } = props
    const { isTouch } = useDevice()

    return (
        <Stack horizontal hoverable gap="md" paddingLeft="lg" paddingY="md" background="level1">
            <Box
                centerContent
                rounded="full"
                height={isTouch ? 'x4' : 'x6'}
                width={isTouch ? 'x4' : 'x6'}
                background="level2"
            >
                <Icon type="delete" color="gray2" padding="xs" />
            </Box>
            <Box>
                <Stack gap>
                    <Box
                        padding
                        horizontal
                        border
                        gap="sm"
                        alignItems="center"
                        color="gray2"
                        background="level1"
                        height="x6"
                        rounded="sm"
                    >
                        <Paragraph>This message was deleted</Paragraph>
                    </Box>
                    {replies && replies.replyEventIds?.size > 0 && event.eventId && (
                        <Box justifySelf="start">
                            <RepliesButton eventId={event.eventId} threadStats={replies} />
                        </Box>
                    )}
                </Stack>
            </Box>
        </Stack>
    )
}

const useHighlightBackground = (
    isHighlight?: boolean,
    pinned?: boolean,
    defaultBackground?: BoxProps['background'],
) => {
    const [isHighlightActive, setHighlightActive] = useState(isHighlight)

    const background = isHighlightActive
        ? ('level2' as const)
        : defaultBackground ?? (pinned ? ('positiveSubtle' as const) : undefined)

    useEffect(() => {
        if (isHighlightActive) {
            const timeout = setTimeout(() => {
                setHighlightActive(false)
            }, 1000)
            return () => {
                clearTimeout(timeout)
            }
        }
    })

    const [backgroundTransitionEnabled, setBackgroundTransitionEnabled] = useState(isHighlight)

    const onTransitionEnd = isHighlight
        ? () => {
              setBackgroundTransitionEnabled(false)
          }
        : undefined

    const style = backgroundTransitionEnabled ? { transition: `background 1s ease` } : undefined

    return background ? { onTransitionEnd, style, background } : { onTransitionEnd, style }
}

const AvatarComponent = (props: AvatarProps & { userId?: string; link?: string }) => {
    const { userId, link, ...avatarProps } = props
    if (userId && link) {
        return <ActiveAvatar {...avatarProps} userId={userId} link={link} />
    }
    return <AvatarWithoutDot {...avatarProps} userId={userId} />
}

const ActiveAvatar = (props: AvatarProps & { userId: string; link: string }) => {
    const { userId, ...avatarProps } = props
    return (
        <Link to={props.link} tabIndex={-1}>
            <AvatarWithoutDot userId={userId} {...avatarProps} />
        </Link>
    )
}

const PinnedContent = (props: { pin: Pin }) => {
    const myUserId = useMyUserId()
    const { pin } = props
    const user = useUserLookup(pin.creatorUserId)
    return (
        <Stack horizontal grow gap="xs" height="height_sm" alignItems="center" color="cta1">
            <Box>
                <Icon type="pinFill" size="square_xxs" />
            </Box>
            <Box>
                <Paragraph size="sm">
                    Pinned by {myUserId === pin.creatorUserId ? 'you' : getPrettyDisplayName(user)}
                </Paragraph>
            </Box>
        </Stack>
    )
}
