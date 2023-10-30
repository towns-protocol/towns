import React, { useCallback, useEffect } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { useDMLatestMessage, useZionContext } from 'use-zion-client'
import { DMChannelIdentifier } from 'use-zion-client/dist/types/dm-channel-identifier'
import { formatDistance } from 'date-fns'
import { Avatar, Box, Icon, IconButton, MotionStack, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { CreateDirectMessage } from './CreateDIrectMessage'

type Props = {
    hideNavigation?: boolean
}
export const DirectMessages = (props: Props) => {
    const { isTouch } = useDevice()
    const [showCreateDirectMessage, setShowCreateDirectMessage] = React.useState(false)
    const hideNavigation = props.hideNavigation ?? false
    const navigate = useNavigate()
    const backButtonPressed = useCallback(() => {
        navigate('/')
    }, [navigate])
    const onDirectMessageCreated = useCallback(() => {
        setShowCreateDirectMessage(false)
    }, [setShowCreateDirectMessage])

    return (
        <Stack height="100%">
            {!hideNavigation && (
                <Box borderBottom>
                    <Stack horizontal padding gap="lg" alignItems="center">
                        {isTouch && <Icon type="back" onClick={backButtonPressed} />}

                        <Text color="default" fontWeight="strong">
                            {showCreateDirectMessage ? 'New Message' : 'Direct Messages'}
                        </Text>
                        <Stack grow />
                        <IconButton
                            icon={showCreateDirectMessage ? 'close' : 'compose'}
                            size="square_md"
                            color="gray2"
                            insetRight="xs"
                            onClick={() => setShowCreateDirectMessage(!showCreateDirectMessage)}
                        />
                    </Stack>
                </Box>
            )}

            {showCreateDirectMessage ? (
                <CreateDirectMessage onDirectMessageCreated={onDirectMessageCreated} />
            ) : (
                <Threads />
            )}
        </Stack>
    )
}

const Threads = () => {
    const navigate = useNavigate()
    const { dmChannels } = useZionContext()
    const messageId = useMatch('messages/:messageId')?.params.messageId
    const { dmUnreadChannelIds } = useZionContext()

    useEffect(() => {
        if (!messageId && dmChannels.length > 0) {
            navigate(`/${PATHS.MESSAGES}/${dmChannels[0].id.slug}`)
        }
    }, [messageId, dmChannels, navigate])

    const onThreadClick = useCallback(
        (id: string) => {
            navigate(`/${PATHS.MESSAGES}/${id}`)
        },
        [navigate],
    )

    return (
        <Stack scroll>
            <Stack padding minHeight="100svh" paddingBottom="safeAreaInsetBottom" gap="xxs">
                {dmChannels.map((channel) => {
                    return (
                        <DirectMessageThread
                            key={channel.id.slug}
                            channel={channel}
                            highlighted={messageId === channel.id.slug}
                            unread={dmUnreadChannelIds.has(channel.id.slug)}
                            onClick={() => onThreadClick(channel.id.slug)}
                        />
                    )
                })}
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
                {channel.userIds.map((userId) => (
                    <Avatar key={userId} userId={userId} insetRight="xs" />
                ))}
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
                                {latest?.body}
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
