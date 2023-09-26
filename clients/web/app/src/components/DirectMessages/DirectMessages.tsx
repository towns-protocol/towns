import React, { useCallback } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { Avatar, Box, Heading, Icon, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { env } from 'utils'
import { PATHS } from 'routes'

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
                            Direct Messages
                        </Text>
                        <Stack grow />
                        <Icon type="compose" color="gray2" />
                    </Stack>
                </Box>
            )}

            {env.DEV ? (
                <DummyThreads />
            ) : (
                <Stack centerContent grow scroll>
                    <Stack
                        centerContent
                        gap="lg"
                        width="250"
                        minHeight={isTouch ? '350' : '100svh'}
                    >
                        <Box padding="md" color="gray2" background="level2" rounded="sm">
                            <Icon type="message" size="square_sm" />
                        </Box>
                        <Heading level={3}>No messages yet</Heading>
                        <Paragraph textAlign="center" color="gray2">
                            When someone sends you a message, it will appear here
                        </Paragraph>
                    </Stack>
                </Stack>
            )}
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
