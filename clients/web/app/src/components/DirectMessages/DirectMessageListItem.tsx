import React, { useCallback, useMemo } from 'react'
import { useDMData, useDMLatestMessage, useMyUserId, useUser } from 'use-zion-client'
import { MostRecentMessageInfo_OneOf } from 'use-zion-client/dist/hooks/use-dm-latest-message'
import { DMChannelIdentifier } from 'use-zion-client/dist/types/dm-channel-identifier'
import { LookupUser } from 'use-zion-client/dist/components/UserLookupContext'
import { Avatar } from '@components/Avatar/Avatar'
import { TimelineEncryptedContent } from '@components/MessageTimeIineItem/items/MessageItem/EncryptedMessageBody/EncryptedMessageBody'
import { UserList } from '@components/UserList/UserList'
import { Box, BoxProps, MotionBox, Paragraph, Stack, Text } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { formatShortDate } from 'utils/formatShortDate'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { GroupDMIcon, GroupDMIconProps } from './GroupDMIcon'

export const DirectMessageListItem = (props: {
    channel: DMChannelIdentifier
    onSelect: (channelId: string) => void
    selected: boolean
    unread: boolean
}) => {
    const { channel, onSelect, selected, unread } = props

    const { latest, unreadCount } = useDMLatestMessage(channel.id)
    const latestUser = useUser(latest?.sender.id)
    const myUserId = useMyUserId()

    const onClick = useCallback(() => {
        onSelect(channel.id.slug)
    }, [channel.id.slug, onSelect])

    return (
        <DirectMessageMotionContainer selected={selected} onClick={onClick}>
            <DirectMessageIcon channel={channel} width="x3" />

            <Box grow gap="sm" width="100%" overflow="hidden" height="100%" paddingY="xxs">
                {/* first line: title and date */}
                <Stack horizontal gap>
                    {/* text on the left */}
                    <Text truncate color="default" fontWeight={unread ? 'medium' : 'normal'}>
                        {/* {data?.isGroup ? 'GM' : 'DM'} */}

                        <DirectMessageName channel={channel} />
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
        </DirectMessageMotionContainer>
    )
}

export const DirectMessageName = (props: { channel: DMChannelIdentifier }) => {
    const { channel } = props
    const { counterParty, data } = useDMData(channel.id)
    const userIds = useMemo(
        () => (data?.isGroup ? data.userIds : [counterParty].filter(notUndefined)),
        [counterParty, data?.isGroup, data?.userIds],
    )

    return userIds ? (
        <UserList
            excludeSelf
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
}) => {
    const { channel } = props
    const avatarSizeMap = {
        x3: 'avatar_sm',
        x4: 'avatar_x4',
        x6: 'avatar_md',
    } as const
    return channel.isGroup ? (
        <Box horizontal insetRight="xs">
            <GroupDMIcon roomIdentifier={channel.id} width={props.width} />
        </Box>
    ) : (
        channel.userIds.map((userId) => (
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
                ? `${
                      myUserId === latestUser.userId
                          ? 'you'
                          : getPrettyDisplayName(latestUser).displayName
                  }: ${info.text}`
                : info.text
        case 'encrypted':
            return (
                <Box grow horizontal paddingY="xs" width="200" shrink={false}>
                    <TimelineEncryptedContent event={{ createdAtEpocMs: 0 }} />
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
