import React, { useCallback } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { useDMLatestMessageText, useZionContext } from 'use-zion-client'
import { DMChannelIdentifier } from 'use-zion-client/dist/types/dm-channel-identifier'
import { Avatar, Box, Icon, IconButton, MotionStack, Stack, Text } from '@ui'
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

    const onThreadClick = useCallback(
        (id: string) => {
            navigate(`/${PATHS.MESSAGES}/${id}`)
        },
        [navigate],
    )

    return (
        <Stack scroll>
            <Stack minHeight="100svh" paddingBottom="safeAreaInsetBottom">
                {dmChannels.map((channel) => {
                    return (
                        <DirectMessageThread
                            key={channel.id.slug}
                            channel={channel}
                            highlighted={messageId === channel.id.slug}
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
}) => {
    const { channel, onClick, highlighted } = props
    const latest = useDMLatestMessageText(channel.id)

    return (
        <MotionStack
            horizontal
            padding
            gap
            key={channel.id.slug}
            alignItems="center"
            background={highlighted ? 'level2' : undefined}
            layout="position"
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            onClick={onClick}
        >
            {channel.userIds.map((userId) => (
                <Avatar key={userId} userId={userId} insetRight="xs" />
            ))}
            <Stack gap="md">
                <Text truncate fontWeight="medium" color="default">
                    {channel.id.networkId}
                </Text>
                <Text truncate>{latest}</Text>
            </Stack>
        </MotionStack>
    )
}
