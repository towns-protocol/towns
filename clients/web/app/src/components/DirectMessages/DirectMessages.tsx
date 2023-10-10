import React, { useCallback } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { Avatar, Box, Icon, IconButton, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { CreateDirectMessage } from './CreateDIrectMessage'

type DummyThread = {
    id: string
    label: string
    description: string
    userId: string
}
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

            {showCreateDirectMessage ? <CreateDirectMessage /> : <DummyThreads />}
        </Stack>
    )
}

const DummyThreads = () => {
    const navigate = useNavigate()

    const messageId = useMatch('messages/:messageId')?.params.messageId

    const onThreadClick = useCallback(
        (id: string) => {
            navigate(`/${PATHS.MESSAGES}/${id}`)
        },
        [navigate],
    )

    const dummyThreads: DummyThread[] = [
        {
            id: '1',
            label: 'tak',
            description: "You: what's up Tak",
            userId: '0xd2F4c40C2c5C6A9730f5C7191F5286EEff241DEF',
        },
        {
            id: '2',
            label: 'erik',
            description: 'erik: hi there',
            userId: '0x376eC15Fa24A76A18EB980629093cFFd559333Bb',
        },
        {
            id: '3',
            label: 'theo_t',
            description: "You: how's it going",
            userId: '0x2FaC60B7bCcEc9b234A2f07448D3B2a045d621B9',
        },
    ]

    return (
        <Stack scroll>
            <Stack minHeight="100svh" paddingBottom="safeAreaInsetBottom">
                {dummyThreads.map((thread) => {
                    return (
                        <Stack
                            horizontal
                            padding
                            gap
                            key={thread.id}
                            alignItems="start"
                            background={messageId === thread.id ? 'level2' : undefined}
                            rounded="sm"
                            onClick={() => onThreadClick(thread.id)}
                        >
                            <Avatar size="avatar_lg" userId={thread.userId} />
                            <Stack grow gap="sm" paddingY="xs">
                                <Stack
                                    horizontal
                                    grow
                                    gap="sm"
                                    alignItems="center"
                                    justifyContent="spaceBetween"
                                >
                                    <Text color="default" fontSize="lg">
                                        {thread.label}
                                    </Text>

                                    <Text color="gray2">1w</Text>
                                </Stack>

                                <Text color="gray2">{thread.description}</Text>
                            </Stack>
                        </Stack>
                    )
                })}
            </Stack>
        </Stack>
    )
}
