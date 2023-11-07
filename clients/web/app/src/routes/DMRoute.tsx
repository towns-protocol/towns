import React from 'react'
import { Outlet, useOutlet } from 'react-router'
import { DirectMessagesPanel } from '@components/DirectMessages/DirectMessages'
import { Box, Heading, Icon, Paragraph, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'

export const DirectMessages = () => {
    const { isTouch } = useDevice()
    const outlet = useOutlet()
    return isTouch ? (
        <>
            <Box absoluteFill background="level1">
                <DirectMessagesPanel />
                <Outlet />
            </Box>
        </>
    ) : (
        outlet ?? (
            <Stack centerContent grow scroll absoluteFill>
                <Stack centerContent gap="lg" width="250" minHeight="100svh">
                    <Box padding="md" color="gray2" background="level2" rounded="sm">
                        <Icon type="message" size="square_sm" />
                    </Box>
                    <Heading level={3}>Welcome to your DMs</Heading>
                    <Paragraph textAlign="center" color="gray2">
                        Direct messages are end to end encrypted conversations between you and other
                        users
                    </Paragraph>
                </Stack>
            </Stack>
        )
    )
}
