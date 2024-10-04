import React, { forwardRef, useCallback, useMemo, useRef } from 'react'
import {
    DMChannelIdentifier,
    LookupUser,
    useDMData,
    useDMLatestMessage,
    useMyUserId,
    useUser,
    useUserLookupContext,
} from 'use-towns-client'
import { MostRecentMessageInfo_OneOf } from 'use-towns-client/dist/hooks/use-dm-latest-message'
import { useInView } from 'react-intersection-observer'
import { Avatar } from '@components/Avatar/Avatar'
import { UserList } from '@components/UserList/UserList'
import { Box, BoxProps, Icon, MotionBox, Paragraph, Stack, Text } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { formatShortDate } from 'utils/formatDates'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { htmlToText } from 'workers/data_transforms'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { truncateTextDMList } from './DirectMessageListItem.css'
import { GroupDMIcon, GroupDMIconProps } from './GroupDMIcon'

type Props = {
    channel: DMChannelIdentifier
    onSelect: (channelId: string) => void
    unread: boolean
}

export const DirectMessageListItem = (props: Props & { selected: boolean }) => {
    const { channel, onSelect, selected, unread } = props

    const { ref, inView } = useInView({
        rootMargin: '400px 0px',
    })

    const inViewRef = useRef(inView)
    inViewRef.current = inViewRef.current || inView

    const onClick = useCallback(() => {
        onSelect(channel.id)
    }, [channel.id, onSelect])

    return (
        <DirectMessageMotionContainer
            selected={selected}
            ref={ref}
            reduceMotion={!inViewRef.current}
            onClick={onClick}
        >
            {inViewRef.current ? (
                <DirectMessageRowContent channel={channel} unread={unread} />
            ) : (
                <Box grow paddingY="xxs">
                    <Stack grow borderRadius="sm" className={shimmerClass} height="x4" />
                </Box>
            )}
        </DirectMessageMotionContainer>
    )
}

export const DirectMessageRowContent = (props: {
    channel: DMChannelIdentifier
    unread?: boolean
}) => {
    const { channel, unread } = props
    const { latest, unreadCount } = useDMLatestMessage(channel.id)
    const latestUser = useUser(latest?.sender?.id)
    const myUserId = useMyUserId()

    return (
        <>
            <DirectMessageIcon
                channel={channel}
                width="x4"
                latestUserId={latestUser?.userId}
                myUserId={myUserId}
            />

            <Box grow gap="sm" width="100%" overflow="hidden" height="100%" paddingY="xxs">
                {/* first line: title and date */}
                <Stack horizontal gap>
                    {/* text on the left */}
                    <Text truncate color="default" fontWeight={unread ? 'medium' : 'normal'}>
                        {/* {data?.isGroup ? 'GM' : 'DM'} */}
                        <DirectMessageName
                            channelId={channel.id}
                            label={channel.properties?.name}
                        />
                    </Text>
                    {/* date on the right */}
                    <Box grow justifyContent="end" alignItems="end">
                        {latest ? (
                            <Paragraph
                                size="xs"
                                style={{ whiteSpace: 'nowrap' }}
                                color={unread ? 'accent' : 'gray2'}
                            >
                                {formatShortDate(latest.createdAtEpochMs)}
                            </Paragraph>
                        ) : (
                            <></>
                        )}
                    </Box>
                </Stack>
                <Stack horizontal style={{ maxHeight: 38 }}>
                    <Text
                        color={unread ? 'default' : 'gray2'}
                        size="sm"
                        className={truncateTextDMList}
                    >
                        <DMMessageContentSummary
                            info={latest?.info}
                            latestUser={latestUser}
                            myUserId={myUserId}
                            channel={channel}
                        />
                    </Text>
                    {/* date on the right */}
                    {unread && (
                        <Box grow justifyContent="start" alignItems="end">
                            <Box
                                centerContent
                                background="accent"
                                height="x2"
                                minWidth="x2"
                                rounded="full"
                            >
                                <Paragraph fontWeight="medium" size="xs">
                                    {unreadCount > 0 ? unreadCount : ''}
                                </Paragraph>
                            </Box>
                        </Box>
                    )}
                </Stack>
            </Box>
        </>
    )
}

export const DirectMessageName = (props: { channelId: string; label: string | undefined }) => {
    const { counterParty, data } = useDMData(props.channelId)
    const userIds = useMemo(
        () => (data?.isGroup ? data.userIds : [counterParty].filter(notUndefined)),
        [counterParty, data?.isGroup, data?.userIds],
    )
    const myUserId = useMyUserId()
    const channelName = props.label

    return channelName ? (
        <>{channelName}</>
    ) : userIds ? (
        <UserList
            excludeSelf
            myUserId={myUserId}
            userIds={userIds}
            maxNames={3}
            renderUser={({ displayName, userId }) => (
                <Box display="inline" key={userId}>
                    {displayName}
                </Box>
            )}
        />
    ) : (
        <></>
    )
}

export const DirectMessageIcon = (props: {
    channel: DMChannelIdentifier
    width: GroupDMIconProps['width']
    latestUserId?: string
    myUserId?: string
}) => {
    const { channel, myUserId: userId } = props
    const avatarSizeMap = {
        x3: 'avatar_sm',
        x4: 'avatar_x4',
        x6: 'avatar_md',
        x12: 'avatar_xl',
    } as const
    return channel.isGroup ? (
        <Box horizontal insetRight="xs">
            <GroupDMIcon
                roomIdentifier={channel.id}
                width={props.width}
                latestUserId={props.latestUserId}
            />
        </Box>
    ) : (
        (channel.userIds.length || !userId ? channel.userIds : [userId]).map((userId) => (
            <Avatar
                key={userId}
                userId={userId}
                insetRight="xs"
                size={props.width ? avatarSizeMap[props.width] : undefined}
            />
        ))
    )
}

const getMessageDisplayName = (user: LookupUser | undefined, myUserId: string | undefined) =>
    user?.userId === myUserId ? 'You' : getPrettyDisplayName(user)

const DMMessageContentSummary = (props: {
    info: undefined | MostRecentMessageInfo_OneOf
    latestUser: undefined | LookupUser
    myUserId: undefined | string
    channel: DMChannelIdentifier
}) => {
    const { myUserId, info, latestUser, channel } = props
    const { lookupUser } = useUserLookupContext()

    const authorDisplayName = useMemo(
        () => (latestUser ? getMessageDisplayName(latestUser, myUserId) : ''),
        [latestUser, myUserId],
    )

    switch (info?.kind) {
        case 'text':
        case 'image':
        case 'attachment':
        case 'gif':
        case 'encrypted': {
            return (
                <MessageContentSummary
                    info={info}
                    authorDisplayName={authorDisplayName}
                    textSize="sm"
                    Wrapper={(props) => (
                        <Box horizontal gap="xs">
                            {authorDisplayName && <Text size="sm">{authorDisplayName}:</Text>}
                            {props.children}
                        </Box>
                    )}
                />
            )
        }
        case 'dm_created': {
            return `You created this DM`
        }
        case 'gdm_created': {
            const creator = lookupUser(info.creatorId)
            const displayName = getMessageDisplayName(creator, myUserId)
            return `${displayName} created this group`
        }
        case 'member_added': {
            const user = lookupUser(info.userId)
            // Since the DM created event is done first, and then the member added event
            // we need to check if it's a DM, if so, we want to show the dm_created message
            if (!channel.isGroup) {
                return `You started a new DM`
            } else {
                const sender = info.senderId && lookupUser(info.senderId)
                const userDisplayName = getMessageDisplayName(user, myUserId)
                const senderDisplayName = sender && getMessageDisplayName(sender, myUserId)

                return `${senderDisplayName} added ${userDisplayName}`
            }
        }
        case 'member_left': {
            const user = lookupUser(info.userId)
            const sender = info.senderId && lookupUser(info.senderId)
            const userDisplayName = getMessageDisplayName(user, myUserId)
            const senderDisplayName = sender && getMessageDisplayName(sender, myUserId)

            if (channel.isGroup) {
                return sender
                    ? `${senderDisplayName} removed ${userDisplayName}`
                    : `${userDisplayName} left this group`
            } else {
                return `${userDisplayName} left this DM`
            }
        }
        case 'member_invited': {
            const user = lookupUser(info.userId)
            const displayName = getMessageDisplayName(user, myUserId)
            return `${displayName} got invited to this group`
        }

        default:
            return (
                <Box horizontal>
                    <Paragraph size="sm">New message</Paragraph>
                </Box>
            )
    }
}

export const MessageContentSummary = (props: {
    info: MostRecentMessageInfo_OneOf
    authorDisplayName?: string
    textSize?: 'sm' | 'md'
    Wrapper?: React.FC<{ children: React.ReactNode }>
}) => {
    const { info, authorDisplayName, textSize, Wrapper = (props) => props.children } = props

    switch (info.kind) {
        case 'text': {
            const unescapedText = htmlToText(info.text)
            return authorDisplayName
                ? `${authorDisplayName}: ${unescapedText}`
                : unescapedText ?? ''
        }

        case 'image': {
            const { images } = info
            return (
                <Wrapper>
                    <Box horizontal gap="xs">
                        <Icon type="camera" size="square_xs" alignSelf="start" />
                        <Text size={textSize}>
                            {images && images.length > 1 ? `${images.length} photos` : 'Photo'}
                        </Text>
                    </Box>
                </Wrapper>
            )
        }
        case 'attachment': {
            const { attachments } = info

            let filename = 'file'
            if (attachments && attachments.length > 0) {
                const file = attachments?.[0]
                if (file.type === 'chunked_media' || file.type === 'embedded_media') {
                    filename = file.info.filename
                }
            }

            return (
                <Wrapper>
                    <Box horizontal gap="xxs">
                        <Icon type="file" size="square_xs" />
                        <Text size={textSize}>
                            {attachments && attachments.length > 1
                                ? `${attachments.length} files`
                                : filename}
                        </Text>
                    </Box>
                </Wrapper>
            )
        }
        case 'gif': {
            return (
                <Wrapper>
                    <Box horizontal gap="xxs">
                        <Icon type="gif" size="square_xs" />
                        <Text size={textSize}>Gif</Text>
                    </Box>
                </Wrapper>
            )
        }
    }
}

export const DirectMessageMotionContainer = forwardRef<
    HTMLDivElement,
    { selected?: boolean; reduceMotion?: boolean } & Omit<
        BoxProps,
        'transition' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
    >
>(({ selected, reduceMotion, ...boxProps }, ref) => (
    <MotionBox
        gap
        horizontal
        layout="position"
        transition={
            reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 120 }
        }
        cursor="pointer"
        hoverable={!selected}
        background={selected ? 'level2' : 'level1'}
        alignItems="start"
        padding="sm"
        borderRadius="sm"
        ref={ref}
        {...boxProps}
    />
))
