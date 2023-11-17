import { formatDistance } from 'date-fns'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useMatch, useNavigate } from 'react-router'
import {
    useDMData,
    useDMLatestMessage,
    useMyUserId,
    useUser,
    useZionContext,
} from 'use-zion-client'
import { DMChannelIdentifier } from 'use-zion-client/dist/types/dm-channel-identifier'
import { MostRecentMessageInfo_OneOf } from 'use-zion-client/dist/hooks/use-dm-latest-message'
import { Link } from 'react-router-dom'
import { useDevice } from 'hooks/useDevice'
import { useCreateLink } from 'hooks/useCreateLink'
import { Box, Icon, MotionStack, Paragraph, Stack, Text } from '@ui'
import { UserList } from '@components/UserList/UserList'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { notUndefined } from 'ui/utils/utils'
import { TimelineEncryptedContent } from '@components/MessageTimeIineItem/items/MessageItem/EncryptedMessageBody/EncryptedMessageBody'
import { Avatar } from '@components/Avatar/Avatar'
import { GroupDMIcon } from './GroupDMIcon'

export const DirectMessageList = () => {
    const navigate = useNavigate()
    const { dmChannels } = useZionContext()
    const messageId = useMatch('messages/:messageId/*')?.params.messageId
    const { dmUnreadChannelIds } = useZionContext()

    const { isTouch } = useDevice()

    const hasInitRef = useRef(false)

    const { createLink } = useCreateLink()

    useEffect(() => {
        if (!hasInitRef.current && !isTouch && !messageId && dmChannels.length > 0) {
            const link = createLink({ messageId: dmChannels[0].id.slug })
            if (link) {
                navigate(link)
            }
        }
        hasInitRef.current = true
    }, [messageId, dmChannels, navigate, isTouch, createLink])

    const onThreadClick = useCallback(
        (id: string) => {
            const link = createLink({ messageId: id })
            if (link) {
                navigate(link)
            }
        },
        [createLink, navigate],
    )

    return (
        <Stack scroll>
            <Stack padding minHeight="100svh" paddingBottom="safeAreaInsetBottom" gap="xxs">
                {dmChannels.length > 0 ? (
                    dmChannels.map((channel) => {
                        return (
                            <DirectMessageThread
                                key={channel.id.slug}
                                channel={channel}
                                highlighted={messageId === channel.id.slug}
                                unread={dmUnreadChannelIds.has(channel.id.slug)}
                                onClick={() => onThreadClick(channel.id.slug)}
                            />
                        )
                    })
                ) : (
                    <Box centerContent absoluteFill padding="md" pointerEvents="none">
                        <Paragraph color="gray2" textAlign="center">
                            Click the compose button above{' '}
                            <Box
                                display="inline-block"
                                style={{ verticalAlign: 'middle' }}
                                paddingBottom="xxs"
                            >
                                <Icon type="compose" size="square_sm" />
                            </Box>
                            <br />
                            to write your first message
                        </Paragraph>
                    </Box>
                )}
            </Stack>
        </Stack>
    )
}

const DirectMessageThread = (props: {
    channel: DMChannelIdentifier
    onClick: () => void
    highlighted: boolean
    unread: boolean
}) => {
    const { channel, onClick, highlighted, unread } = props
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

    if (!latest && !highlighted) {
        // skip empty threads unless they are selected (i.e. new message)
        return <></>
    }

    const userList = userIds ? (
        <UserList
            excludeSelf
            userIds={userIds}
            renderUser={({ displayName, userId }) => (
                <Box display="inline" key={userId} tooltip={<ProfileHoverCard userId={userId} />}>
                    <Link to={`profile/${userId}`}>{displayName}</Link>
                </Box>
            )}
        />
    ) : (
        <></>
    )

    return (
        <MotionStack
            key={channel.id.slug}
            layout="position"
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            cursor="pointer"
            onClick={onClick}
        >
            <Box
                gap
                horizontal
                hoverable={!highlighted}
                background={highlighted ? 'level2' : 'level1'}
                alignItems="start"
                padding="sm"
                borderRadius="sm"
            >
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
                                    {formatDistance(latest.createdAtEpocMs, Date.now(), {
                                        addSuffix: false,
                                    })}
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
            </Box>
        </MotionStack>
    )
}
