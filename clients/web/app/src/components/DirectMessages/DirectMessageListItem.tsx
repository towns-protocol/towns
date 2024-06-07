import React, { useCallback, useMemo } from 'react'
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
import { Avatar } from '@components/Avatar/Avatar'
import { TimelineEncryptedContent } from '@components/EncryptedContent/EncryptedMessageBody'
import { UserList } from '@components/UserList/UserList'
import { Box, BoxProps, Icon, MotionBox, Paragraph, Stack, Text } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { formatShortDate } from 'utils/formatDates'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { htmlToText } from 'workers/data_transforms'
import { GroupDMIcon, GroupDMIconProps } from './GroupDMIcon'

type Props = {
    channel: DMChannelIdentifier
    onSelect: (channelId: string) => void
    unread: boolean
}

export const DirectMessageListItem = (props: Props & { selected: boolean }) => {
    const { channel, onSelect, selected, unread } = props

    const onClick = useCallback(() => {
        onSelect(channel.id)
    }, [channel.id, onSelect])

    return (
        <DirectMessageMotionContainer selected={selected} onClick={onClick}>
            <DirectMessageRowContent channel={channel} unread={unread} />
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
                <Stack horizontal>
                    {/* truncated message body */}
                    <Text>
                        {/* nested text hack to get cap-size vertical margins right */}
                        <Text
                            color={unread ? 'default' : 'gray2'}
                            size="sm"
                            style={{
                                // todo: experiment with this, may not keep
                                // and if we keep it will move into the Text component
                                padding: '4px 0',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                            }}
                        >
                            <LastDirectMessageContent
                                info={latest?.info}
                                latestUser={latestUser}
                                myUserId={myUserId}
                                channel={channel}
                            />
                        </Text>
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

const getMessageDisplayName = (user: LookupUser, myUserId: string | undefined) =>
    user.userId === myUserId ? 'You' : getPrettyDisplayName(user)

const LastDirectMessageContent = (props: {
    info: undefined | MostRecentMessageInfo_OneOf
    latestUser: undefined | LookupUser
    myUserId: undefined | string
    channel: DMChannelIdentifier
}) => {
    const { myUserId, info, latestUser, channel } = props
    const { usersMap } = useUserLookupContext()

    const authorDisplayName = useMemo(
        () => (latestUser ? getMessageDisplayName(latestUser, myUserId) : ''),
        [latestUser, myUserId],
    )

    switch (info?.kind) {
        case 'image': {
            const { images } = info
            return (
                <Box horizontal gap="xs">
                    {authorDisplayName && <Text size="sm">{authorDisplayName}:</Text>}
                    <Box horizontal gap="xxs">
                        <Icon type="camera" size="square_xs" />
                        <Text size="sm">
                            {images && images.length > 1 ? `${images.length} photos` : 'Photo'}
                        </Text>
                    </Box>
                </Box>
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
                <Box horizontal gap="xs">
                    {authorDisplayName && <Text size="sm">{authorDisplayName}:</Text>}
                    <Box horizontal gap="xxs">
                        <Icon type="file" size="square_xs" />
                        <Text size="sm">
                            {attachments && attachments.length > 1
                                ? `${attachments.length} files`
                                : filename}
                        </Text>
                    </Box>
                </Box>
            )
        }
        case 'gif': {
            return (
                <Box horizontal gap="xs">
                    {authorDisplayName && <Text size="sm">{authorDisplayName}:</Text>}
                    <Box horizontal gap="xxs">
                        <Icon type="gif" size="square_xs" />
                        <Text size="sm">Gif</Text>
                    </Box>
                </Box>
            )
        }
        case 'dm_created': {
            return `You created this DM`
        }
        case 'gdm_created': {
            const creator = usersMap[info.creatorId]
            const displayName = getMessageDisplayName(creator, myUserId)
            return `${displayName} created this group`
        }
        case 'member_added': {
            const user = usersMap[info.userId]
            const displayName = getMessageDisplayName(user, myUserId)
            // Since the DM created event is done first, and then the member added event
            // we need to check if its a DM, if so, we want to show the dm_created message
            return channel.isGroup
                ? `${displayName} got added to this group`
                : `You started a new DM`
        }
        case 'member_left': {
            const user = usersMap[info.userId]
            const displayName = getMessageDisplayName(user, myUserId)
            // TODO: HNT-6766 - show who left the group: `X left Y`
            return channel.isGroup
                ? `${displayName} left this group`
                : `${displayName} left this DM`
        }
        // TODO: HNT-6766 - add new case:
        // case 'member_removed': X removed Y from this group
        case 'member_invited': {
            const user = usersMap[info.userId]
            const displayName = getMessageDisplayName(user, myUserId)
            return `${displayName} got invited to this group`
        }

        case 'text': {
            const unescapedText = htmlToText(info.text)
            return authorDisplayName ? `${authorDisplayName}: ${unescapedText}` : unescapedText
        }
        case 'encrypted':
            return (
                <Box grow horizontal paddingY="xs" width="200" shrink={false}>
                    <TimelineEncryptedContent
                        event={{ createdAtEpochMs: 0 }}
                        content={info.content}
                    />
                </Box>
            )
        default:
            return (
                <Box horizontal>
                    <Paragraph size="sm">New message</Paragraph>
                </Box>
            )
    }
}

export const DirectMessageMotionContainer = ({
    selected,
    ...boxProps
}: { selected?: boolean } & Omit<
    BoxProps,
    'transition' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
>) => (
    <MotionBox
        gap
        horizontal
        layout="position"
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        cursor="pointer"
        hoverable={!selected}
        background={selected ? 'level2' : 'level1'}
        alignItems="start"
        padding="sm"
        borderRadius="sm"
        {...boxProps}
    />
)
