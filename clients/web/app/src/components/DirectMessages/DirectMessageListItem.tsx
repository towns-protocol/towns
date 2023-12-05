import React, { useCallback, useMemo } from 'react'
import { useDMData, useDMLatestMessage, useMyUserId, useUser } from 'use-zion-client'
import { MostRecentMessageInfo_OneOf } from 'use-zion-client/dist/hooks/use-dm-latest-message'
import { DMChannelIdentifier } from 'use-zion-client/dist/types/dm-channel-identifier'
import { Avatar } from '@components/Avatar/Avatar'
import { TimelineEncryptedContent } from '@components/MessageTimeIineItem/items/MessageItem/EncryptedMessageBody/EncryptedMessageBody'
import { UserList } from '@components/UserList/UserList'
import { Box, BoxProps, MotionBox, Paragraph, Stack, Text } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { formatShortDate } from 'utils/formatShortDate'
import { GroupDMIcon } from './GroupDMIcon'

export const DirectMessageListItem = (props: {
    channel: DMChannelIdentifier
    onSelect: (channelId: string) => void
    highlighted: boolean
    unread: boolean
}) => {
    const { channel, onSelect, highlighted, unread } = props
    const latest = useDMLatestMessage(channel.id)
    const latestUser = useUser(latest?.sender.id)
    const myUserId = useMyUserId()

    const latestMessageRender = (info: undefined | MostRecentMessageInfo_OneOf) => {
        switch (info?.kind) {
            case 'media':
                return '📷'
            case 'text':
                return latestUser
                    ? `${myUserId === latestUser.userId ? 'you' : latestUser.displayName}: ${
                          info.text
                      }`
                    : info.text
            case 'encrypted':
                return (
                    <Box paddingY="xs">
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

    const { counterParty, data } = useDMData(channel.id)
    const userIds = useMemo(
        () => (data?.isGroup ? data.userIds : [counterParty].filter(notUndefined)),
        [counterParty, data?.isGroup, data?.userIds],
    )

    const userList = userIds ? (
        <UserList
            excludeSelf
            userIds={userIds}
            renderUser={({ displayName, userId }) => (
                <Box display="inline" key={userId}>
                    {displayName}
                </Box>
            )}
        />
    ) : (
        <></>
    )

    const onClick = useCallback(() => {
        onSelect(channel.id.slug)
    }, [channel.id.slug, onSelect])

    return (
        <DirectMessageMotionContainer highlighted={highlighted} onClick={onClick}>
            {channel.isGroup ? (
                <Box insetRight="xs">
                    <GroupDMIcon roomIdentifier={channel.id} />
                </Box>
            ) : (
                channel.userIds.map((userId) => (
                    <Avatar key={userId} userId={userId} insetRight="xs" />
                ))
            )}

            <Box grow gap="sm" width="100%" overflow="hidden" height="100%" paddingY="xxs">
                {/* first line: title and date */}
                <Stack horizontal gap>
                    {/* text on the left */}
                    <Text truncate color="default" fontWeight={unread ? 'medium' : 'normal'}>
                        {/* {data?.isGroup ? 'GM' : 'DM'} */}
                        {userList}
                    </Text>
                    {/* date on the right */}
                    <Box grow justifyContent="end" alignItems="end">
                        {latest ? (
                            <Paragraph size="xs" style={{ whiteSpace: 'nowrap' }} color="gray2">
                                {formatShortDate(latest.createdAtEpocMs)}
                            </Paragraph>
                        ) : (
                            <></>
                        )}
                    </Box>
                </Stack>
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
                        {latestMessageRender(latest?.info)}
                    </Text>
                </Text>
            </Box>
        </DirectMessageMotionContainer>
    )
}

export const DirectMessageMotionContainer = ({
    highlighted,
    ...boxProps
}: { highlighted?: boolean } & Omit<
    BoxProps,
    'transition' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
>) => (
    <MotionBox
        gap
        horizontal
        layout="position"
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        cursor="pointer"
        hoverable={!highlighted}
        background={highlighted ? 'level2' : 'level1'}
        alignItems="start"
        padding="sm"
        borderRadius="sm"
        {...boxProps}
    />
)
