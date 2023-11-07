import { formatDistance } from 'date-fns'
import React, { useCallback, useEffect, useRef } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { useDMLatestMessage, useZionContext } from 'use-zion-client'
import { DMChannelIdentifier } from 'use-zion-client/dist/types/dm-channel-identifier'
import { MostRecentMessageInfo_OneOf } from 'use-zion-client/dist/hooks/use-dm-latest-message'
import { useDevice } from 'hooks/useDevice'
import { useCreateLink } from 'hooks/useCreateLink'
import { Avatar, Box, Icon, MotionStack, Paragraph, Stack, Text } from '@ui'
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

    const latestMessageRender = (info: MostRecentMessageInfo_OneOf) => {
        switch (info.kind) {
            case 'media':
                return '📷'
            case 'text':
                return info.text
            case 'encrypted':
                return '🔒'
            default:
                return ''
        }
    }

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
                paddingX="sm"
                paddingY="md"
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

                {latest ? (
                    <Box gap="sm" width="100%" overflow="hidden">
                        {/* first line: title and date */}
                        <Stack horizontal gap>
                            {/* text on the left */}
                            <Box grow overflow="hidden" paddingY="sm" insetY="xs">
                                <Text
                                    truncate
                                    color={unread ? 'default' : 'gray2'}
                                    fontWeight={unread ? 'medium' : 'normal'}
                                >
                                    {channel.id.networkId}
                                </Text>
                            </Box>
                            {/* date on the right */}
                            <Box justifyContent="end">
                                {latest ? (
                                    <Paragraph
                                        size="xs"
                                        style={{ whiteSpace: 'nowrap' }}
                                        color="gray2"
                                    >
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
                                {latestMessageRender(latest.info)}
                            </Text>
                        </Text>
                    </Box>
                ) : (
                    <></>
                )}
            </Box>
        </MotionStack>
    )
}
