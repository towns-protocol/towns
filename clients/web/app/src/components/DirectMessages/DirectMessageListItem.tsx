import React, { useCallback, useMemo } from 'react'
import {
    DMChannelIdentifier,
    LookupUser,
    useDMData,
    useDMLatestMessage,
    useMyUserId,
    useUser,
} from 'use-towns-client'
import { MostRecentMessageInfo_OneOf } from 'use-towns-client/dist/hooks/use-dm-latest-message'
import { Avatar } from '@components/Avatar/Avatar'
import { TimelineEncryptedContent } from '@components/EncryptedContent/EncryptedMessageBody'
import { UserList } from '@components/UserList/UserList'
import { Box, BoxProps, MotionBox, Paragraph, Stack, Text } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { formatShortDate } from 'utils/formatDates'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
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
                                {formatShortDate(latest.createdAtEpocMs)}
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

const LastDirectMessageContent = (props: {
    info: undefined | MostRecentMessageInfo_OneOf
    latestUser: undefined | LookupUser
    myUserId: undefined | string
}) => {
    const { myUserId, info, latestUser } = props

    switch (info?.kind) {
        case 'media':
            return '📷'
        case 'text':
            return latestUser
                ? `${myUserId === latestUser.userId ? 'you' : getPrettyDisplayName(latestUser)}: ${
                      info.text
                  }`
                : info.text
        case 'encrypted':
            return (
                <Box grow horizontal paddingY="xs" width="200" shrink={false}>
                    <TimelineEncryptedContent
                        event={{ createdAtEpocMs: 0 }}
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
